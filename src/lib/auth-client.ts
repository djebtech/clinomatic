"use client";

import { useEffect, useState } from "react";

interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  role: string;
  clinicId: string | null;
  phone: string;
}

interface Session {
  user: SessionUser;
  token: string;
  expiresAt: string;
}

// ─── signIn ──────────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) return { error: data.error ?? "LOGIN_FAILED", data: null };
  return { error: null, data };
}

// ─── signOut ─────────────────────────────────────────────────────────────────

export async function signOut() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

// ─── useSession ──────────────────────────────────────────────────────────────

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setIsPending(false));
  }, []);

  return { data: session, isPending };
}
