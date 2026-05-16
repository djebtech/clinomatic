"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { User, Loader2, Camera } from "lucide-react";
import { Label } from "@/components/ui/label";

const ROLE_LABELS: Record<string, string> = {
  CLINIC_OWNER: "Gérant",
  CLINIC_STAFF: "Personnel",
  SUPER_ADMIN: "Super Admin",
  CONFIRMATION_AGENT: "Agent",
  DOCTOR: "Médecin",
};

const TIMEZONES = [
  { value: "Africa/Algiers", label: "Africa/Algiers (UTC+1)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+2)" },
  { value: "UTC", label: "UTC" },
];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.user.getMe.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [timezone, setTimezone] = useState("Africa/Algiers");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setPhone(me.phone ?? "");
      setJobTitle(me.jobTitle ?? "");
      setDepartment(me.department ?? "");
      setTimezone(me.timezone ?? "Africa/Algiers");
    }
  }, [me]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, phone, jobTitle, department, timezone });
      await utils.user.getMe.invalidate();
      toast({ title: "Profil mis à jour!", description: "Vos modifications ont été sauvegardées." });
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message });
    }
  };

  const roleLabel = me?.role ? (ROLE_LABELS[me.role] ?? me.role) : "";
  const initial = (name || me?.name || "?")[0]?.toUpperCase();
  const memberSince = me?.startDate
    ? new Date(me.startDate).toLocaleDateString("fr-DZ", { year: "numeric", month: "long", day: "numeric" })
    : "—";

  if (isLoading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-8" />
          <div className="space-y-1">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-4 w-56" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <SkeletonBlock className="h-40 w-full" />
            <SkeletonBlock className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
          <User className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-500 text-sm">Gérez vos informations personnelles</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Avatar & Basic */}
          <Card>
            <CardHeader><CardTitle>Photo & Identité</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  {me?.avatar ? (
                    <img src={me.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-teal-500 flex items-center justify-center text-white text-3xl font-bold">
                      {initial}
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Modifier la photo
                </Button>
                <div className="text-center">
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">
                    {roleLabel}
                  </span>
                  {me?.clinic?.name && (
                    <p className="text-xs text-gray-400 mt-1">{me.clinic.name}</p>
                  )}
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nom complet *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={me?.email ?? ""} readOnly className="bg-gray-50 cursor-not-allowed text-gray-500" />
                  <p className="text-xs text-gray-400">La modification d&apos;email nécessite une vérification.</p>
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555 000 000" />
                </div>
                <div className="space-y-1">
                  <Label>Titre du poste</Label>
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Ex: Réceptionniste" />
                </div>
                <div className="space-y-1">
                  <Label>Département</Label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ex: Administration" />
                </div>
                <div className="space-y-1">
                  <Label>Fuseau horaire</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Work Info */}
          <Card>
            <CardHeader><CardTitle>Informations professionnelles</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">Rôle</span>
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700">{roleLabel}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">Clinique</span>
                <span className="font-medium">{me?.clinic?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-500">Abonnement</span>
                <span className="font-medium capitalize">{me?.clinic?.subscriptionPlan ?? "—"}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Membre depuis</span>
                <span className="font-medium">{memberSince}</span>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader><CardTitle>Préférences</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Fuseau horaire</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  Les préférences de langue sont gérées depuis l&apos;en-tête de l&apos;application.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={updateProfile.isPending || !name.trim()}
            className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
          >
            {updateProfile.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
