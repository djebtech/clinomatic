import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import type { Prisma } from "@prisma/client";

export const doctorRouter = createTRPCRouter({
  list: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.doctor.findMany({
      where: { clinicId: ctx.clinicId!, isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  create: clinicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        specialty: z.string().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.doctor.create({
        data: {
          ...input,
          clinicId: ctx.clinicId!,
          schedule: {} as Prisma.InputJsonValue,
        },
      });
    }),

  update: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        specialty: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.doctor.update({
        where: { id, clinicId: ctx.clinicId! },
        data,
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
});
