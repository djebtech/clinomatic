"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Shield, Eye, EyeOff, Monitor, Smartphone, Loader2, LogOut } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Password strength helpers
function getStrength(pw: string): "weak" | "medium" | "strong" {
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasNum && hasSpecial) return "strong";
  if (pw.length >= 8 && hasNum) return "medium";
  return "weak";
}

const STRENGTH_CONFIG = {
  weak:   { color: "bg-red-500",    label: "Faible",  width: "w-1/3" },
  medium: { color: "bg-orange-400", label: "Moyen",   width: "w-2/3" },
  strong: { color: "bg-green-500",  label: "Fort",    width: "w-full" },
};

function parseDevice(userAgent: string): { isDesktop: boolean; browser: string; os: string } {
  const ua = userAgent.toLowerCase();
  const isDesktop = !/android|iphone|ipad|mobile/.test(ua);
  const browser = ua.includes("firefox") ? "Firefox" : ua.includes("edg") ? "Edge" : ua.includes("safari") && !ua.includes("chrome") ? "Safari" : "Chrome";
  const os = ua.includes("windows") ? "Windows" : ua.includes("mac") ? "macOS" : ua.includes("linux") ? "Linux" : ua.includes("android") ? "Android" : "iOS";
  return { isDesktop, browser, os };
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function SecurityPage() {
  const utils = trpc.useUtils();

  // Password form state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const changePassword = trpc.user.changePassword.useMutation();

  // Sessions
  const { data: sessions, isLoading: sessionsLoading } = trpc.user.getActiveSessions.useQuery();
  const revokeSession = trpc.user.revokeSession.useMutation();
  const revokeOthers = trpc.user.revokeOtherSessions.useMutation();

  const strength = newPw ? getStrength(newPw) : null;
  const strengthCfg = strength ? STRENGTH_CONFIG[strength] : null;

  const requirements = [
    { label: "Au moins 8 caractères", met: newPw.length >= 8 },
    { label: "Au moins 1 majuscule", met: /[A-Z]/.test(newPw) },
    { label: "Au moins 1 chiffre", met: /[0-9]/.test(newPw) },
    { label: "Au moins 1 caractère spécial (!@#$...)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPw) },
  ];

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 8 caractères." });
      return;
    }
    if (newPw !== confirmPw) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas." });
      return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Mot de passe modifié!", description: "Votre mot de passe a été mis à jour." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message });
    }
  };

  const handleRevoke = async (sessionId: string) => {
    try {
      await revokeSession.mutateAsync({ sessionId });
      await utils.user.getActiveSessions.invalidate();
      toast({ title: "Session révoquée", description: "L'appareil a été déconnecté." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message });
    }
  };

  const handleRevokeAll = async () => {
    try {
      await revokeOthers.mutateAsync();
      await utils.user.getActiveSessions.invalidate();
      toast({ title: "Sessions révoquées", description: "Tous les autres appareils ont été déconnectés." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
          <Shield className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sécurité</h1>
          <p className="text-gray-500 text-sm">Gérez votre mot de passe et vos sessions actives</p>
        </div>
      </div>

      {/* Section 1: Change Password */}
      <Card>
        <CardHeader><CardTitle>Changer le mot de passe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Mot de passe actuel</Label>
            <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="••••••••" />
          </div>

          <div className="space-y-1">
            <Label>Nouveau mot de passe</Label>
            <PasswordInput value={newPw} onChange={setNewPw} placeholder="••••••••" />
            {newPw && strengthCfg && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${strengthCfg.color} ${strengthCfg.width}`} />
                  </div>
                  <span className={`text-xs font-medium ${strength === "strong" ? "text-green-600" : strength === "medium" ? "text-orange-500" : "text-red-500"}`}>
                    {strengthCfg.label}
                  </span>
                </div>
                <ul className="space-y-0.5 mt-2">
                  {requirements.map((req) => (
                    <li key={req.label} className={`text-xs flex items-center gap-1.5 ${req.met ? "text-green-600" : "text-gray-400"}`}>
                      <span>{req.met ? "✓" : "○"}</span>
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Confirmer le nouveau mot de passe</Label>
            <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="••••••••" />
            {confirmPw && newPw !== confirmPw && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={changePassword.isPending || !currentPw || !newPw || !confirmPw}
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700"
          >
            {changePassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* Section 2: Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <p className="text-sm text-gray-500">Appareils connectés à votre compte</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sessions?.map((session) => {
                const { isDesktop, browser, os } = parseDevice(session.userAgent ?? "");
                const lastActive = formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true, locale: fr });
                return (
                  <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {isDesktop
                        ? <Monitor className="h-5 w-5 text-gray-500" />
                        : <Smartphone className="h-5 w-5 text-gray-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{browser} · {os}</p>
                        {session.isCurrent && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full font-medium">
                            Cet appareil
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {session.ipAddress ?? "Unknown"} · {lastActive}
                      </p>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0"
                        disabled={revokeSession.isPending}
                        onClick={() => handleRevoke(session.id)}
                      >
                        Révoquer
                      </Button>
                    )}
                  </div>
                );
              })}
              {(!sessions || sessions.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune session active</p>
              )}
            </div>
          )}

          {sessions && sessions.filter((s) => !s.isCurrent).length > 0 && (
            <Button
              variant="outline"
              className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50"
              disabled={revokeOthers.isPending}
              onClick={handleRevokeAll}
            >
              {revokeOthers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Se déconnecter de tous les autres appareils
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Security Tips */}
      <Card>
        <CardHeader><CardTitle>Conseils de sécurité</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="text-xl leading-none">🔐</span>
              <span className="text-gray-600">Utilisez un mot de passe fort et unique pour ce compte.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl leading-none">📱</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Authentification à deux facteurs</span>
                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">Bientôt disponible</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl leading-none">🔄</span>
              <span className="text-gray-600">Changez votre mot de passe tous les 3 mois.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-xl leading-none">👁</span>
              <span className="text-gray-600">Vérifiez régulièrement vos sessions actives pour détecter tout accès non autorisé.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
