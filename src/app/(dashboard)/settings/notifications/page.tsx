"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Bell, Loader2 } from "lucide-react";

type Prefs = {
  email: boolean;
  whatsapp: boolean;
  emailAppointments: boolean;
  emailPayments: boolean;
  emailSystem: boolean;
  emailDailySummary: boolean;
  quietHoursEnabled: boolean;
  quietHoursFrom: string;
  quietHoursTo: string;
};

const DEFAULT_PREFS: Prefs = {
  email: true,
  whatsapp: false,
  emailAppointments: true,
  emailPayments: true,
  emailSystem: true,
  emailDailySummary: false,
  quietHoursEnabled: false,
  quietHoursFrom: "22:00",
  quietHoursTo: "08:00",
};

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={disabled ? "opacity-40 cursor-not-allowed" : ""}
      />
    </div>
  );
}

function ChannelRow({
  label,
  subtitle,
  checked,
  onChange,
}: {
  label: string;
  subtitle: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function NotificationsPage() {
  const { data, isLoading } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.user.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      utils.user.getMe.invalidate();
    },
  });

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data?.notificationPreferences && !initialized) {
      const p = data.notificationPreferences as Partial<Prefs>;
      setPrefs({
        email: p.email ?? DEFAULT_PREFS.email,
        whatsapp: p.whatsapp ?? DEFAULT_PREFS.whatsapp,
        emailAppointments: p.emailAppointments ?? DEFAULT_PREFS.emailAppointments,
        emailPayments: p.emailPayments ?? DEFAULT_PREFS.emailPayments,
        emailSystem: p.emailSystem ?? DEFAULT_PREFS.emailSystem,
        emailDailySummary: p.emailDailySummary ?? DEFAULT_PREFS.emailDailySummary,
        quietHoursEnabled: p.quietHoursEnabled ?? DEFAULT_PREFS.quietHoursEnabled,
        quietHoursFrom: p.quietHoursFrom ?? DEFAULT_PREFS.quietHoursFrom,
        quietHoursTo: p.quietHoursTo ?? DEFAULT_PREFS.quietHoursTo,
      });
      setInitialized(true);
    }
  }, [data, initialized]);

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync(prefs);
      toast({ title: "Préférences enregistrées", description: "Vos préférences de notification ont été mises à jour.", variant: "success" });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer les préférences.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-teal-600" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">Choisissez quand et comment vous souhaitez être notifié</p>
      </div>

      {/* Card 1: Rendez-vous */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Nouveau rendez-vous</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">In-app</span>
                <Switch checked={true} disabled className="opacity-40 cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Email</span>
                <Switch checked={prefs.emailAppointments} onCheckedChange={(v) => set("emailAppointments", v)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Rendez-vous annulé</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">In-app</span>
                <Switch checked={true} disabled className="opacity-40 cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Email</span>
                <Switch checked={prefs.emailAppointments} onCheckedChange={(v) => set("emailAppointments", v)} />
              </div>
            </div>
          </div>

          <ToggleRow
            label="Résumé quotidien"
            checked={prefs.emailDailySummary}
            onChange={(v) => set("emailDailySummary", v)}
          />

          <p className="text-xs text-gray-400 pt-2 pb-1">Les notifications in-app sont toujours activées</p>
        </CardContent>
      </Card>

      {/* Card 2: Paiements */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Paiements</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <ToggleRow
            label="Paiement reçu"
            checked={prefs.emailPayments}
            onChange={(v) => set("emailPayments", v)}
          />
          <ToggleRow
            label="Facture impayée"
            checked={prefs.emailPayments}
            onChange={(v) => set("emailPayments", v)}
          />
        </CardContent>
      </Card>

      {/* Card 3: Système */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Système</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <ToggleRow
            label="WhatsApp déconnecté"
            checked={prefs.emailSystem}
            onChange={(v) => set("emailSystem", v)}
          />
          <ToggleRow
            label="Limite d'utilisation atteinte"
            checked={prefs.emailSystem}
            onChange={(v) => set("emailSystem", v)}
          />
        </CardContent>
      </Card>

      {/* Card 4: Canaux */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Canaux de notification</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          <ChannelRow
            label="Email"
            subtitle="Recevoir les notifications par email"
            checked={prefs.email}
            onChange={(v) => set("email", v)}
          />
          <ChannelRow
            label="WhatsApp"
            subtitle="Recevoir les notifications sur WhatsApp"
            checked={prefs.whatsapp}
            onChange={(v) => set("whatsapp", v)}
          />
        </CardContent>
      </Card>

      {/* Card 5: Heures silencieuses */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Heures silencieuses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label="Activer les heures silencieuses"
            checked={prefs.quietHoursEnabled}
            onChange={(v) => set("quietHoursEnabled", v)}
          />

          {prefs.quietHoursEnabled && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm text-gray-600 w-8">De</label>
                  <Input
                    type="time"
                    value={prefs.quietHoursFrom}
                    onChange={(e) => set("quietHoursFrom", e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-sm text-gray-600 w-4">À</label>
                  <Input
                    type="time"
                    value={prefs.quietHoursTo}
                    onChange={(e) => set("quietHoursTo", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                Seules les notifications critiques seront envoyées pendant cette période
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enregistrement…
          </>
        ) : (
          "Enregistrer les préférences"
        )}
      </Button>
    </div>
  );
}
