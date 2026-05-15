import { NextResponse, type NextRequest } from "next/server";
import { getSession, deleteSession, clearSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (session) {
    await deleteSession(session.token);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}
