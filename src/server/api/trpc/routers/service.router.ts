import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";

export const serviceRouter = createTRPCRouter({
  list: clinicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.service.findMany({
      where: { clinicId: ctx.clinicId!, isActive: true },
      orderBy: { name: "asc" },
    });
  }),

  create: clinicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        nameAr: z.string().optional(),
        price: z.number().min(0),
        duration: z.number().min(5),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.service.create({
        data: { ...input, clinicId: ctx.clinicId! },
      });
    }),

  update: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        nameAr: z.string().optional(),
        price: z.number().min(0).optional(),
        duration: z.number().min(5).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.service.update({
        where: { id, clinicId: ctx.clinicId! },
        data,
      });
    }),

  delete: clinicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const apptCount = await ctx.prisma.appointment.count({
        where: { serviceId: input.id },
      });
      if (apptCount > 0) {
        return ctx.prisma.service.update({
          where: { id: input.id, clinicId: ctx.clinicId! },
          data: { isActive: false },
        });
      }
      return ctx.prisma.service.delete({
        where: { id: input.id, clinicId: ctx.clinicId! },
      });
    }),
});
