import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "clinomatic_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Sign In ────────────────────────────────────────────────────────────────

export async function signInWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) return { error: "USER_NOT_FOUND" };
  if (!user.isActive) return { error: "USER_INACTIVE" };
  if (!user.password) return { error: "NO_PASSWORD" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "INVALID_PASSWORD" };

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });

  // Update lastActive
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActive: new Date() },
  });

  return { token, user };
}

// ─── Get Session ─────────────────────────────────────────────────────────────

export async function getSession(req: NextRequest | Request) {
  // Read from cookie header
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = parseCookie(cookieHeader, SESSION_COOKIE);

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => null);
    return null;
  }

  return session;
}

// ─── Sign Out ────────────────────────────────────────────────────────────────

export async function deleteSession(token: string) {
  await prisma.session.delete({ where: { token } }).catch(() => null);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function buildSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires.toUTCString()}; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ─── Hash password (for seeding / setup) ────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
