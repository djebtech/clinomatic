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

      return months;
    }),
});
