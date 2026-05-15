import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  const session = await getSession(opts.req);
  const user = session?.user;

  return {
    session,
    prisma,
    user,
    clinicId: user?.clinicId ?? undefined,
    userId: user?.id,
    role: user?.role,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
