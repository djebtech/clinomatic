import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import { startOfWeek, endOfWeek, subWeeks, format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const analyticsRouter = createTRPCRouter({
  getDashboard: clinicProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const thisWeekStart = input.startDate ? new Date(input.startDate) : startOfWeek(now);
      const thisWeekEnd = input.endDate ? new Date(input.endDate) : endOfWeek(now);
      const lastWeekStart = subWeeks(thisWeekStart, 1);
      const lastWeekEnd = subWeeks(thisWeekEnd, 1);

      const [thisWeek, lastWeek, confirmed, attended, noShows, bySource, topServices] =
        await Promise.all([
          ctx.prisma.appointment.aggregate({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
            _count: { id: true },
            _sum: { price: true },
          }),
          ctx.prisma.appointment.aggregate({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: lastWeekStart, lte: lastWeekEnd } },
            _count: { id: true },
            _sum: { price: true },
          }),
          ctx.prisma.appointment.count({
            where: {
              clinicId: ctx.clinicId!,
              createdAt: { gte: thisWeekStart, lte: thisWeekEnd },
              status: "CONFIRMED",
            },
          }),
          ctx.prisma.appointment.count({
            where: {
              clinicId: ctx.clinicId!,
              createdAt: { gte: thisWeekStart, lte: thisWeekEnd },
              status: "ATTENDED",
            },
          }),
          ctx.prisma.appointment.count({
            where: {
              clinicId: ctx.clinicId!,
              createdAt: { gte: thisWeekStart, lte: thisWeekEnd },
              status: "NO_SHOW",
            },
          }),
          ctx.prisma.appointment.groupBy({
            by: ["source"],
            where: { clinicId: ctx.clinicId!, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
            _count: { id: true },
          }),
          ctx.prisma.appointment.groupBy({
            by: ["serviceId"],
            where: { clinicId: ctx.clinicId!, createdAt: { gte: thisWeekStart, lte: thisWeekEnd } },
            _count: { id: true },
            _sum: { price: true },
            orderBy: { _count: { id: "desc" } },
            take: 5,
          }),
        ]);

      const serviceIds = topServices.map((s) => s.serviceId);
      const services = await ctx.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true, nameAr: true },
      });

      const topServicesWithNames = topServices.map((ts) => ({
        ...ts,
        service: services.find((s) => s.id === ts.serviceId),
      }));

      const total = thisWeek._count.id;
      return {
        thisWeek: {
          bookings: total,
          revenue: thisWeek._sum.price || 0,
          confirmed,
          attended,
          noShows,
          confirmationRate: total > 0 ? (confirmed / total) * 100 : 0,
          attendanceRate: confirmed > 0 ? (attended / confirmed) * 100 : 0,
        },
        lastWeek: {
          bookings: lastWeek._count.id,
          revenue: lastWeek._sum.price || 0,
        },
        bySource,
        topServices: topServicesWithNames,
      };
    }),

  getWeeklyTrend: clinicProcedure
    .input(z.object({ weeks: z.number().min(1).max(12).default(6) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const weeks = [];

      for (let i = input.weeks - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i));
        const weekEnd = endOfWeek(subWeeks(now, i));

        const [stats, confirmed, attended, noShows] = await Promise.all([
          ctx.prisma.appointment.aggregate({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: weekStart, lte: weekEnd } },
            _count: { id: true },
            _sum: { price: true },
          }),
          ctx.prisma.appointment.count({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: weekStart, lte: weekEnd }, status: "CONFIRMED" },
          }),
          ctx.prisma.appointment.count({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: weekStart, lte: weekEnd }, status: "ATTENDED" },
          }),
          ctx.prisma.appointment.count({
            where: { clinicId: ctx.clinicId!, createdAt: { gte: weekStart, lte: weekEnd }, status: "NO_SHOW" },
          }),
        ]);

        weeks.push({
          week: format(weekStart, "dd MMM"),
          bookings: stats._count.id,
          revenue: stats._sum.price || 0,
          confirmed,
          attended,
          noShows,
        });
      }

      return weeks;
    }),

  getMonthlyRevenue: clinicProcedure
    .input(z.object({ months: z.number().min(1).max(12).default(6) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const months = [];

      for (let i = input.months - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));

        const stats = await ctx.prisma.appointment.aggregate({
          where: {
            clinicId: ctx.clinicId!,
            createdAt: { gte: monthStart, lte: monthEnd },
            status: { in: ["ATTENDED", "CONFIRMED"] },
          },
          _sum: { price: true },
          _count: { id: true },
        });

        months.push({
          month: format(monthStart, "MMM yyyy"),
          revenue: stats._sum.price || 0,
          bookings: stats._count.id,
        });
      }

      return months.map((m) => ({ ...m, paid: Math.round(m.revenue * 0.7) }));
    }),

  // ── SERVICE BREAKDOWN ─────────────────────────────────────────────────────

  getServiceBreakdown: clinicProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const start = input.startDate ? new Date(input.startDate) : subMonths(now, 1);
      const end = input.endDate ? new Date(input.endDate) : now;

      const grouped = await ctx.prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { clinicId: ctx.clinicId!, createdAt: { gte: start, lte: end } },
        _count: { id: true },
        _sum: { price: true },
        orderBy: { _count: { id: "desc" } },
      });

      const serviceIds = grouped.map((g) => g.serviceId);
      const services = await ctx.prisma.service.findMany({ where: { id: { in: serviceIds } } });
      const svcMap = new Map(services.map((s) => [s.id, s]));

      const total = grouped.reduce((acc, g) => acc + g._count.id, 0);
      return grouped.map((g) => ({
        serviceId: g.serviceId,
        name: svcMap.get(g.serviceId)?.name ?? "Unknown",
        bookings: g._count.id,
        revenue: g._sum.price ?? 0,
        percentage: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
      }));
    }),

  // ── DOCTOR PERFORMANCE ────────────────────────────────────────────────────

  getDoctorPerformance: clinicProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const start = input.startDate ? new Date(input.startDate) : subMonths(now, 1);
      const end = input.endDate ? new Date(input.endDate) : now;

      const grouped = await ctx.prisma.appointment.groupBy({
        by: ["doctorId", "status"],
        where: { clinicId: ctx.clinicId!, createdAt: { gte: start, lte: end }, doctorId: { not: null } },
        _count: { id: true },
        _sum: { price: true },
      });

      const doctorIds = [...new Set(grouped.map((g) => g.doctorId!))];
      const doctors = await ctx.prisma.doctor.findMany({ where: { id: { in: doctorIds } } });
      const docMap = new Map(doctors.map((d) => [d.id, d]));

      const byDoctor = new Map<string, { name: string; specialty: string | null; total: number; attended: number; revenue: number }>();
      for (const g of grouped) {
        if (!g.doctorId) continue;
        const doc = docMap.get(g.doctorId);
        if (!byDoctor.has(g.doctorId)) {
          byDoctor.set(g.doctorId, { name: doc?.name ?? "Unknown", specialty: doc?.specialty ?? null, total: 0, attended: 0, revenue: 0 });
        }
        const entry = byDoctor.get(g.doctorId)!;
        entry.total += g._count.id;
        entry.revenue += g._sum.price ?? 0;
        if (g.status === "ATTENDED") entry.attended += g._count.id;
      }

      return Array.from(byDoctor.entries()).map(([id, data]) => ({
        doctorId: id,
        name: data.name,
        specialty: data.specialty,
        appointments: data.total,
        attended: data.attended,
        attendanceRate: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
        revenue: data.revenue,
      }));
    }),

  // ── PEAK HOURS HEATMAP ────────────────────────────────────────────────────

  getPeakHours: clinicProcedure.query(async ({ ctx }) => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const appointments = await ctx.prisma.appointment.findMany({
      where: { clinicId: ctx.clinicId!, date: { gte: threeMonthsAgo } },
      select: { date: true },
    });

    // Build a 7×12 grid (days × hours 8am–8pm)
    const grid: number[][] = Array.from({ length: 7 }, () => new Array(12).fill(0));
    for (const apt of appointments) {
      const day = apt.date.getDay(); // 0=sun, 6=sat
      const hour = apt.date.getHours();
      if (hour >= 8 && hour < 20) {
        grid[day][hour - 8] = (grid[day][hour - 8] ?? 0) + 1;
      }
    }

    return { grid, hours: Array.from({ length: 12 }, (_, i) => `${i + 8}:00`) };
  }),

  // ── RECOMMENDATIONS ────────────────────────────────────────────────────────

  getRecommendations: clinicProcedure.query(async ({ ctx }) => {
    const thirtyDaysAgo = subMonths(new Date(), 1);

    const [total, confirmed, attended, noShows, newPatients, pendingCount] = await Promise.all([
      ctx.prisma.appointment.count({ where: { clinicId: ctx.clinicId!, createdAt: { gte: thirtyDaysAgo } } }),
      ctx.prisma.appointment.count({ where: { clinicId: ctx.clinicId!, createdAt: { gte: thirtyDaysAgo }, status: { in: ["CONFIRMED", "ATTENDED"] } } }),
      ctx.prisma.appointment.count({ where: { clinicId: ctx.clinicId!, createdAt: { gte: thirtyDaysAgo }, status: "ATTENDED" } }),
      ctx.prisma.appointment.count({ where: { clinicId: ctx.clinicId!, createdAt: { gte: thirtyDaysAgo }, status: "NO_SHOW" } }),
      ctx.prisma.patient.count({ where: { clinicId: ctx.clinicId!, createdAt: { gte: thirtyDaysAgo } } }),
      ctx.prisma.appointment.count({ where: { clinicId: ctx.clinicId!, status: "PENDING" } }),
    ]);

    const confirmRate = total > 0 ? (confirmed / total) * 100 : 0;
    const noShowRate = attended + noShows > 0 ? (noShows / (attended + noShows)) * 100 : 0;

    const insights: { type: "danger" | "warning" | "success" | "info"; message: string; action?: string }[] = [];

    if (noShowRate > 15) {
      insights.push({ type: "danger", message: `High no-show rate (${Math.round(noShowRate)}%). Enable WhatsApp reminders.`, action: "/settings/whatsapp" });
    }
    if (confirmRate < 60 && total > 10) {
      insights.push({ type: "warning", message: `Low confirmation rate (${Math.round(confirmRate)}%). Assign more agents.`, action: "/admin/confirmation-manager" });
    }
    if (pendingCount > 20) {
      insights.push({ type: "warning", message: `${pendingCount} appointments still pending confirmation.`, action: "/agent/queue" });
    }
    if (newPatients > 0) {
      insights.push({ type: "success", message: `${newPatients} new patients this month — keep up the good work!` });
    }
    if (confirmRate >= 80) {
      insights.push({ type: "success", message: `Excellent confirmation rate (${Math.round(confirmRate)}%)!` });
    }
    if (insights.length === 0) {
      insights.push({ type: "info", message: "Not enough data yet. Keep adding appointments." });
    }

    return insights;
  }),

  // ── BOOKING PAGE ANALYTICS ────────────────────────────────────────────────

  getBookingPageStats: clinicProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const start = input.startDate ? new Date(input.startDate) : subMonths(now, 1);
      const end = input.endDate ? new Date(input.endDate) : now;

      const [visits, conversions] = await Promise.all([
        ctx.prisma.bookingPageVisit.count({ where: { clinicId: ctx.clinicId!, visitedAt: { gte: start, lte: end } } }),
        ctx.prisma.bookingPageVisit.count({ where: { clinicId: ctx.clinicId!, visitedAt: { gte: start, lte: end }, convertedToBooking: true } }),
      ]);

      return {
        visits,
        conversions,
        conversionRate: visits > 0 ? Math.round((conversions / visits) * 100) : 0,
      };
    }),
});
