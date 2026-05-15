import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure, adminProcedure } from "../procedures";
import type { Prisma } from "@prisma/client";

const scheduleSchema = z.record(
  z.string(),
  z.object({ open: z.boolean(), start: z.string().optional(), end: z.string().optional() })
);

export const doctorRouter = createTRPCRouter({
  // ── Clinic-scoped ─────────────────────────────────────────────────────────

  list: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.doctor.findMany({
      where: { clinicId: ctx.clinicId!, isActive: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { appointments: true } } },
    });
  }),

  create: clinicProcedure
    .input(z.object({
      name: z.string().min(1),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      schedule: scheduleSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.doctor.create({
        data: { ...input, clinicId: ctx.clinicId!, schedule: (input.schedule ?? {}) as Prisma.InputJsonValue },
      });
    }),

  update: clinicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
      schedule: scheduleSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, schedule, ...data } = input;
      return ctx.prisma.doctor.update({
        where: { id, clinicId: ctx.clinicId! },
        data: { ...data, ...(schedule ? { schedule: schedule as Prisma.InputJsonValue } : {}) },
      });
    }),

  delete: clinicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.doctor.update({
        where: { id: input.id, clinicId: ctx.clinicId! },
        data: { isActive: false },
      });
    }),

  // ── Admin procedures ──────────────────────────────────────────────────────

  adminList: adminProcedure
    .input(z.object({ clinicId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.doctor.findMany({
        where: { clinicId: input.clinicId },
        orderBy: { name: "asc" },
        include: { _count: { select: { appointments: true } } },
      });
    }),

  adminCreate: adminProcedure
    .input(z.object({
      clinicId: z.string(),
      name: z.string().min(1),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      schedule: scheduleSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { schedule, ...rest } = input;
      return ctx.prisma.doctor.create({
        data: { ...rest, schedule: (schedule ?? {}) as Prisma.InputJsonValue },
      });
    }),

  adminUpdate: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      specialty: z.string().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
      schedule: scheduleSchema.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, schedule, ...data } = input;
      return ctx.prisma.doctor.update({
        where: { id },
        data: { ...data, ...(schedule ? { schedule: schedule as Prisma.InputJsonValue } : {}) },
      });
    }),

  adminDelete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.doctor.delete({ where: { id: input.id } });
    }),
});
