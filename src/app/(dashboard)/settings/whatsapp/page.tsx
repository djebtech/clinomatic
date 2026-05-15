"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, Loader2, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default function WhatsAppSettingsPage() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.whatsapp.getConfig.useQuery();
  const updateConfig = trpc.whatsapp.updateConfig.useMutation({
    onSuccess: () => utils.whatsapp.getConfig.invalidate(),
  });

  const [form, setForm] = useState({
    phoneNumber: "",
    apiToken: "",
    apiUrl: "",
    autoReminder24h: true,
    autoReminder2h: true,
    autoFollowUp: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        phoneNumber: config.phoneNumber || "",
        apiToken: config.apiToken || "",
        apiUrl: config.apiUrl || "",
        autoReminder24h: config.autoReminder24h,
        autoReminder2h: config.autoReminder2h,
        autoFollowUp: config.autoFollowUp,
      });
    }
  }, [config]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig.mutate(form);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration WhatsApp</h1>
          <p className="text-gray-500 text-sm">API Evolution · automatisations</p>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          {config?.isConnected ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">WhatsApp connecté</span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 font-medium">WhatsApp non connecté</span>
            </>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>API Evolution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Numéro WhatsApp Business</Label>
              <Input
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="213555000000"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de l&apos;API</Label>
              <Input
                value={form.apiUrl}
                onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
                placeholder="http://your-evolution-api.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Clé API</Label>
              <Input
                type="password"
                value={form.apiToken}
                onChange={(e) => setForm({ ...form, apiToken: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Automatisations</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "autoReminder24h", label: "Rappel 24h avant", desc: "Envoyer automatiquement un rappel 24h avant" },
              { key: "autoReminder2h", label: "Rappel 2h avant", desc: "Envoyer automatiquement un rappel 2h avant" },
              { key: "autoFollowUp", label: "Suivi post-visite", desc: "Envoyer un message de suivi après la visite" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-teal-600"
                  checked={form[item.key as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                />
              </label>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" disabled={updateConfig.isPending}>
          {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sauvegarder
        </Button>
        {updateConfig.isSuccess && (
          <span className="text-green-600 text-sm ml-3">Sauvegardé!</span>
        )}
      </form>
    </div>
  );
}
