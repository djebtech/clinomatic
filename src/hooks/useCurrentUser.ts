"use client";

import { useSession } from "@/lib/auth-client";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  clinicId?: string;
  phone?: string;
}

export function useCurrentUser() {
  const { data: session, isPending } = useSession();

  const user = session?.user as CurrentUser | undefined;

  return {
    user,
    isLoading: isPending,
    isAuthenticated: !!session,
    role: user?.role,
    clinicId: user?.clinicId,
  };
}
