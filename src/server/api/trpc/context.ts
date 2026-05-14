import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  clinicId?: string;
}

export const createTRPCContext = async (opts: { req: NextRequest }) => {
  let sessionUser: SessionUser | null = null;

  try {
    const raw = await auth.api.getSession({ headers: opts.req.headers });
    if (raw?.user) {
      sessionUser = raw.user as unknown as SessionUser;
    }
  } catch {
    // No session
  }

  return {
    prisma,
    user: sessionUser,
    clinicId: sessionUser?.clinicId,
    userId: sessionUser?.id,
    role: sessionUser?.role,
    session: sessionUser ? { user: sessionUser } : null,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
