import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/auth/debug — test DB connectivity and table presence
// Remove or protect this route once auth is working
export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    // Test basic DB connection
    await prisma.$queryRaw`SELECT 1`;
    results.db = "connected";
  } catch (e) {
    results.db = `error: ${String(e)}`;
  }

  try {
    const count = await prisma.user.count();
    results.users = count;
  } catch (e) {
    results.users = `error: ${String(e)}`;
  }

  try {
    const count = await prisma.session.count();
    results.sessions = count;
  } catch (e) {
    results.sessions = `error: ${String(e)}`;
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: "admin@clinomatic.dz" },
      select: { id: true, email: true, role: true, isActive: true, password: true },
    });
    results.adminUser = user
      ? { ...user, password: user.password ? `set (${user.password.slice(0, 7)}...)` : "NOT SET" }
      : "NOT FOUND";
  } catch (e) {
    results.adminUser = `error: ${String(e)}`;
  }

  return NextResponse.json(results);
}
