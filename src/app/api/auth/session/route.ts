import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      clinicId: session.user.clinicId,
      phone: session.user.phone,
    },
  });
}
