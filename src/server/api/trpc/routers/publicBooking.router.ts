import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { publicProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { scheduleMessagesForAppointment } from "@/lib/whatsapp/scheduler";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateSlots(
  startTime: string,
  endTime: string,
  duration: number,
  existing: { date: Date; duration: number }[],
  date: Date
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const step = duration + 5;

  for (let m = startMins; m + duration <= endMins; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

    const slotDate = new Date(date);
    slotDate.setHours(h, min, 0, 0);
    const slotEnd = new Date(slotDate.getTime() + duration * 60_000);

    const conflict = existing.some((apt) => {
      const aptEnd = new Date(apt.date.getTime() + apt.duration * 60_000);
      return slotDate < aptEnd && slotEnd > apt.date;
    });

    slots.push({ time, available: !conflict });
  }
  return slots;
}

function generateBookingRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export const publicBookingRouter = createTRPCRouter({
  // ── GET CLINIC INFO (public) ──────────────────────────────────────────────

  getClinicBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { slug: input.slug },
        include: {
          services: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
          doctors: {
            where: { isActive: true },
            orderBy: { name: "asc" },
          },
        },
      });

      if (!clinic || !clinic.isActive) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clinic not found" });
      }

      if (!clinic.bookingPageEnabled) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Online booking is disabled for this clinic" });
      }

      // Return safe public data only (no sensitive fields)
      return {
        id: clinic.id,
        name: clinic.name,
        slug: clinic.slug,
        logo: clinic.logo,
        phone: clinic.phone,
        email: clinic.email,
        address: clinic.address,
        city: clinic.city,
        workingHours: clinic.workingHours,
        holidays: clinic.holidays,
        bookingPageCustomization: clinic.bookingPageCustomization,
        services: clinic.services.map((s) => ({
          id: s.id,
          name: s.name,
          nameAr: s.nameAr,
          price: s.price,
          duration: s.duration,
          description: s.description,
          color: s.color,
        })),
        doctors: clinic.doctors.map((d) => ({
          id: d.id,
          name: d.name,
          specialty: d.specialty,
        })),
      };
    }),

  // ── CHECK AVAILABILITY (public) ───────────────────────────────────────────

  checkAvailability: publicProcedure
    .input(
      z.object({
        clinicSlug: z.string(),
        serviceId: z.string(),
        doctorId: z.string().optional(),
        date: z.string(), // ISO date string
      })
    )
    .query(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { slug: input.clinicSlug },
        include: { services: true },
      });

      if (!clinic) throw new TRPCError({ code: "NOT_FOUND" });

      const service = clinic.services.find((s) => s.id === input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const date = new Date(input.date);
      const dayName = DAY_NAMES[date.getDay()];
      const workingHours = clinic.workingHours as Record<string, { open: string; close: string; enabled: boolean }>;
      const dayConfig = workingHours[dayName];

      if (!dayConfig?.enabled) return { slots: [], reason: "closed" };

      // Check if it's a holiday
      const isHoliday = clinic.holidays.some((h) => {
        const hd = new Date(h);
        return hd.getFullYear() === date.getFullYear() && hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
      });
      if (isHoliday) return { slots: [], reason: "holiday" };

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existing = await ctx.prisma.appointment.findMany({
        where: {
          clinicId: clinic.id,
          doctorId: input.doctorId ?? undefined,
          date: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        },
        select: { date: true, duration: true },
      });

      const slots = generateSlots(
        dayConfig.open,
        dayConfig.close,
        service.duration,
        existing,
        date
      );

      return { slots, reason: null };
    }),

  // ── CREATE PUBLIC BOOKING ──────────────────────────────────────────────────

  createPublicBooking: publicProcedure
    .input(
      z.object({
        clinicSlug: z.string(),
        serviceId: z.string(),
        doctorId: z.string().optional(),
        date: z.string(), // ISO datetime
        patientName: z.string().min(2),
        patientPhone: z.string().min(9),
        patientEmail: z.string().email().optional(),
        patientDob: z.string().optional(),
        patientGender: z.string().optional(),
        notes: z.string().optional(),
        consentWhatsApp: z.boolean().default(true),
        referrer: z.string().optional(),
        deviceType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { slug: input.clinicSlug },
        include: { services: true },
      });

      if (!clinic || !clinic.isActive || !clinic.bookingPageEnabled) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clinic not found or booking disabled" });
      }

      const service = clinic.services.find((s) => s.id === input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      // Validate slot is still available
      const aptDate = new Date(input.date);
      const aptEnd = new Date(aptDate.getTime() + service.duration * 60_000);
      const buffer = new Date(aptDate.getTime() - 5 * 60_000); // 5-min buffer

      const conflict = await ctx.prisma.appointment.findFirst({
        where: {
          clinicId: clinic.id,
          doctorId: input.doctorId ?? null,
          status: { notIn: ["CANCELLED", "RESCHEDULED"] },
          AND: [
            { date: { lt: aptEnd } },
            { date: { gt: buffer } },
          ],
        },
      });

      if (conflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This slot was just booked. Please choose another time.",
        });
      }

      // Find or create patient
      let patient = await ctx.prisma.patient.findFirst({
        where: { clinicId: clinic.id, phone: input.patientPhone },
      });

      const crypto = await import("crypto");
      const phoneHash = crypto.createHash("sha256").update(input.patientPhone).digest("hex");

      if (!patient) {
        patient = await ctx.prisma.patient.create({
          data: {
            clinicId: clinic.id,
            name: input.patientName,
            phone: input.patientPhone,
            email: input.patientEmail ?? null,
            dateOfBirth: input.patientDob ? new Date(input.patientDob) : null,
            gender: input.patientGender ?? null,
            source: "public_booking",
            consentWhatsApp: input.consentWhatsApp,
            phoneHash: phoneHash + "_" + clinic.id,
          },
        });
      } else {
        // Update consent and info if needed
        await ctx.prisma.patient.update({
          where: { id: patient.id },
          data: {
            name: input.patientName,
            email: input.patientEmail ?? undefined,
            consentWhatsApp: input.consentWhatsApp,
          },
        });
      }

      // Generate booking reference
      const bookingRef = generateBookingRef();

      // Create appointment
      const appointment = await ctx.prisma.appointment.create({
        data: {
          clinicId: clinic.id,
          patientId: patient.id,
          serviceId: service.id,
          doctorId: input.doctorId ?? null,
          date: aptDate,
          duration: service.duration,
          price: service.price,
          source: "public_booking",
          sourceUrl: input.referrer ?? null,
          deviceType: input.deviceType ?? null,
          status: "PENDING",
          notes: input.notes ?? null,
          timeline: {
            create: {
              action: "CREATED",
              details: { source: "public_booking", bookingRef },
            },
          },
        },
      });

      // Track visit conversion
      await ctx.prisma.bookingPageVisit.create({
        data: {
          clinicId: clinic.id,
          referrer: input.referrer ?? null,
          deviceType: input.deviceType ?? null,
          convertedToBooking: true,
          appointmentId: appointment.id,
        } as any,
      });

      // Schedule WhatsApp messages (fire-and-forget)
      scheduleMessagesForAppointment({
        appointmentId: appointment.id,
        clinicId: clinic.id,
      }).catch((err) => console.error("[Public Booking WhatsApp]", err));

      return {
        success: true,
        bookingRef,
        appointmentId: appointment.id,
        appointmentDate: appointment.date,
        serviceName: service.name,
        servicePrice: service.price,
        clinicName: clinic.name,
        clinicPhone: clinic.phone,
        clinicAddress: clinic.address,
      };
    }),

  // ── TRACK VISIT ───────────────────────────────────────────────────────────

  trackVisit: publicProcedure
    .input(
      z.object({
        clinicSlug: z.string(),
        referrer: z.string().optional(),
        deviceType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { slug: input.clinicSlug },
        select: { id: true },
      });
      if (!clinic) return { ok: false };

      await ctx.prisma.bookingPageVisit.create({
        data: {
          clinicId: clinic.id,
          referrer: input.referrer ?? null,
          deviceType: input.deviceType ?? null,
        } as any,
      });
      return { ok: true };
    }),

  // ── GET BOOKING PAGE STATS (public - for trust indicators) ──────────────

  getPageStats: publicProcedure
    .input(z.object({ clinicSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const clinic = await ctx.prisma.clinic.findUnique({
        where: { slug: input.clinicSlug },
        select: { id: true },
      });
      if (!clinic) return null;

      const [totalPatients, recentBookings] = await Promise.all([
        ctx.prisma.patient.count({ where: { clinicId: clinic.id } }),
        ctx.prisma.appointment.count({
          where: { clinicId: clinic.id, status: { in: ["CONFIRMED", "ATTENDED"] } },
        }),
      ]);

      return { totalPatients, recentBookings };
    }),
});
