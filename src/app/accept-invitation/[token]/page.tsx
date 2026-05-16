"use client";

import React, { useState, use } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function PasswordStrength({ password }: { password: string }) {
  const len = password.length;
  const strength = len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3;
  const colors = ["bg-gray-200", "bg-red-400", "bg-orange-400", "bg-green-500"];
  const labels = ["", "Faible", "Moyen", "Fort"];
  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : "bg-gray-200"}`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs ${strength === 1 ? "text-red-500" : strength === 2 ? "text-orange-500" : "text-green-600"}`}>
          {labels[strength]}
        </p>
      )}
    </div>
  );
}

export default function AcceptInvitationPage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const token = params.token;

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data, isLoading, error } = trpc.team.getInvitationInfo.useQuery({ token });

  const acceptMut = trpc.team.acceptInvitation.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => setFormError(e.message),
  });

  // Pre-fill name when data loads
  React.useEffect(() => {
    if (data?.name && !name) setName(data.name);
  }, [data?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setFormError("Les mots de passe ne correspondent pas.");
      return;
    }

    acceptMut.mutate({ token, password, name: name || undefined });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Error / invalid token
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-14 w-14 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Lien invalide ou expiré</h2>
          <p className="text-sm text-gray-500">
            Cette invitation n&apos;est plus valide. Contactez votre administrateur.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Retour à la connexion</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Bienvenue dans l&apos;équipe!</h2>
          <p className="text-sm text-gray-500">Votre compte a été activé avec succès.</p>
          <Link href="/">
            <Button className="w-full">Aller au tableau de bord →</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Invitation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-teal-600">Clinomatic</h1>
          <p className="text-sm text-gray-600">
            Vous avez été invité par{" "}
            <span className="font-semibold">{data.inviterName}</span>{" "}
            à rejoindre{" "}
            <span className="font-semibold">{data.clinicName}</span>
          </p>
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-800">
            {data.roleLabel}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              value={data.email ?? ""}
              readOnly
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              required
              minLength={8}
            />
            <PasswordStrength password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
            />
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={acceptMut.isPending}>
            {acceptMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Activation...</>
            ) : (
              "Accepter et rejoindre"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-1 text-xs text-gray-400">
          <p>
            Cette invitation expire le{" "}
            <span className="font-medium">
              {format(new Date(data.expiresAt), "dd MMM yyyy", { locale: fr })}
            </span>
          </p>
          <p>
            Problème?{" "}
            <a href="mailto:support@clinomatic.dz" className="text-teal-600 hover:underline">
              Contactez support@clinomatic.dz
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
