import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { clinicProcedure } from "../procedures";
import { hashPhone } from "@/lib/utils";

export const patientRouter = createTRPCRouter({
  list: clinicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where = {
        clinicId: ctx.clinicId!,
        ...(input.search && {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { phone: { contains: input.search } },
          ],
        }),
      };

      const patients = await ctx.prisma.patient.findMany({
        where,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { appointments: true } },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      if (patients.length > input.limit) {
        const nextItem = patients.pop();
        nextCursor = nextItem!.id;
      }

      return { patients, nextCursor };
    }),

  getById: clinicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const patient = await ctx.prisma.patient.findFirst({
        where: { id: input.id, clinicId: ctx.clinicId! },
        include: {
          appointments: {
            orderBy: { date: "desc" },
            take: 10,
            include: { service: true, doctor: true },
          },
        },
      });
      if (!patient) throw new TRPCError({ code: "NOT_FOUND" });
      return patient;
    }),

  create: clinicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(9),
        email: z.string().email().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["MALE", "FEMALE"]).optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneHash = hashPhone(input.phone);
      return ctx.prisma.patient.create({
        data: {
          ...input,
          phoneHash,
          clinicId: ctx.clinicId!,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        },
      });
    }),

  update: clinicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().nullable(),
        dateOfBirth: z.string().optional().nullable(),
        gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
        address: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.patient.update({
        where: { id, clinicId: ctx.clinicId! },
        data: {
          ...data,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
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
    const [total, newThisMonth] = await Promise.all([
      ctx.prisma.patient.count({ where: { clinicId: ctx.clinicId! } }),
      ctx.prisma.patient.count({
        where: {
          clinicId: ctx.clinicId!,
          createdAt: { gte: new Date(new Date().setDate(1)) },
        },
      }),
    ]);
    return { total, newThisMonth };
  }),
});
