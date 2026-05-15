import { NextResponse, type NextRequest } from "next/server";
import { signInWithPassword, buildSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const result = await signInWithPassword(email, password);

    if ("error" in result) {
      const messages: Record<string, string> = {
        USER_NOT_FOUND: "Aucun compte avec cet email",
        USER_INACTIVE: "Compte désactivé",
        NO_PASSWORD: "Connexion par mot de passe non configurée",
        INVALID_PASSWORD: "Mot de passe incorrect",
      };
      const msg = result.error ? (messages[result.error] ?? "Identifiants invalides") : "Identifiants invalides";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const { token, user } = result;

    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clinicId: user.clinicId,
        phone: user.phone,
      },
    });

    response.headers.set("Set-Cookie", buildSessionCookie(token));
    return response;
  } catch (err) {
    console.error("[Auth/Login]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
