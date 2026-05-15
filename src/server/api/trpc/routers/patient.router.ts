import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import { hashPhone } from "@/lib/utils";

const patientInputSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  // Medical
  bloodType: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  chronicConditions: z.string().optional().nullable(),
  currentMedications: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  // Consent
  consentSMS: z.boolean().optional(),
  consentWhatsApp: z.boolean().optional(),
  consentMarketing: z.boolean().optional(),
});

export const patientRouter = createTRPCRouter({
  list: clinicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        source: z.string().optional(),
        gender: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        page: z.number().default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { clinicId: ctx.clinicId! };

      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { phone: { contains: input.search } },
          { email: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.source) where.source = input.source;
      if (input.gender) where.gender = input.gender;

      const [patients, total] = await Promise.all([
        ctx.prisma.patient.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: { select: { appointments: true } },
          },
        }),
        ctx.prisma.patient.count({ where }),
      ]);

      return {
        patients,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  getById: clinicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await ctx.prisma.patient.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId! },
        include: {
          appointments: {
            orderBy: { date: "desc" },
            take: 20,
            include: {
              service: { select: { name: true, price: true } },
              doctor: { select: { name: true } },
            },
          },
          notes_list: {
            orderBy: { createdAt: "desc" },
            include: {
              author: { select: { name: true } },
            },
          },
          _count: { select: { appointments: true } },
        },
      });
      if (!patient) throw new TRPCError({ code: "NOT_FOUND" });
      return patient;
    }),

  create: clinicProcedure
    .input(patientInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Check phone uniqueness within clinic
      const existing = await ctx.prisma.patient.findFirst({
        where: { clinicId: ctx.clinicId!, phone: input.phone },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "phone_exists",
        });
      }

      const phoneHash = hashPhone(input.phone);
      const { dateOfBirth, ...rest } = input;
      return ctx.prisma.patient.create({
        data: {
          ...rest,
          phoneHash,
          clinicId: ctx.clinicId!,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          consentSMS: rest.consentSMS ?? true,
          consentWhatsApp: rest.consentWhatsApp ?? true,
          consentMarketing: rest.consentMarketing ?? false,
        },
      });
    }),

  update: clinicProcedure
    .input(patientInputSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, dateOfBirth, ...data } = input;

      // If phone is being changed, check uniqueness
      if (data.phone) {
        const existing = await ctx.prisma.patient.findFirst({
          where: { clinicId: ctx.clinicId!, phone: data.phone, NOT: { id } },
        });
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "phone_exists" });
        }
      }

      return ctx.prisma.patient.update({
        where: { id, clinicId: ctx.clinicId! },
        data: {
          ...data,
          ...(dateOfBirth !== undefined
            ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
            : {}),
          ...(data.phone ? { phoneHash: hashPhone(data.phone) } : {}),
        },
      });
    }),

  delete: clinicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.patient.delete({
        where: { id: input.id, clinicId: ctx.clinicId! },
      });
    }),

  stats: clinicProcedure.query(async ({ ctx }) => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [total, newThisMonth, bySource] = await Promise.all([
      ctx.prisma.patient.count({ where: { clinicId: ctx.clinicId! } }),
      ctx.prisma.patient.count({
        where: { clinicId: ctx.clinicId!, createdAt: { gte: startOfMonth } },
      }),
      ctx.prisma.patient.groupBy({
        by: ["source"],
        where: { clinicId: ctx.clinicId! },
        _count: true,
      }),
    ]);

    return { total, newThisMonth, bySource };
  }),

  addNote: clinicProcedure
    .input(z.object({ patientId: z.string(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Verify patient belongs to clinic
      const patient = await ctx.prisma.patient.findFirst({
        where: { id: input.patientId, clinicId: ctx.clinicId! },
      });
      if (!patient) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.patientNote.create({
        data: {
          patientId: input.patientId,
          authorId: ctx.userId!,
          content: input.content,
        },
        include: { author: { select: { name: true } } },
      });
    }),

  deleteNote: clinicProcedure
    .input(z.object({ noteId: z.string(), patientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify patient belongs to clinic
      const patient = await ctx.prisma.patient.findFirst({
        where: { id: input.patientId, clinicId: ctx.clinicId! },
      });
      if (!patient) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.patientNote.delete({ where: { id: input.noteId } });
    }),
});
