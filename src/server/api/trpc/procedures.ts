import { TRPCError } from "@trpc/server";
import { middleware, publicProcedure } from "./trpc";

const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user! } });
});

const hasClinic = middleware(async ({ ctx, next }) => {
  if (!ctx.clinicId && ctx.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "No clinic access" });
  }
  return next();
});

const isAgent = middleware(async ({ ctx, next }) => {
  if (ctx.role !== "CONFIRMATION_AGENT" && ctx.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Agents only" });
  }
  return next();
});

const isAdmin = middleware(async ({ ctx, next }) => {
  if (ctx.role !== "SUPER_ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admins only" });
  }
  return next();
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
export const clinicProcedure = protectedProcedure.use(hasClinic);
export const agentProcedure = protectedProcedure.use(isAgent);
export const adminProcedure = protectedProcedure.use(isAdmin);
