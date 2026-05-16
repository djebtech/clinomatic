"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import {
  MessageCircle, ArrowLeft, Wifi, WifiOff, RefreshCw, QrCode,
  Loader2, CheckCircle2, XCircle, ToggleRight,
  FileText, History, Send, RotateCcw, Phone, MessageSquare, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type TabKey = "connection" | "automation" | "templates" | "history";

const TEMPLATE_KEYS = [
  { key: "confirmTemplate" as const, label: "Confirmation Request", icon: "📋" },
  { key: "reminder24hTemplate" as const, label: "24h Reminder", icon: "🔔" },
  { key: "reminder2hTemplate" as const, label: "2h Reminder", icon: "⏰" },
  { key: "followUpTemplate" as const, label: "Follow-up", icon: "🙏" },
  { key: "noShowRecoveryTemplate" as const, label: "No-show Recovery", icon: "😕" },
  { key: "recallTemplate" as const, label: "Recall Message", icon: "👋" },
];

type TemplateKey = "confirmTemplate" | "reminder24hTemplate" | "reminder2hTemplate" | "followUpTemplate" | "noShowRecoveryTemplate" | "recallTemplate";

const STATUS_COLORS: Record<string, string> = {
  QUEUED: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-teal-100 text-teal-700",
  READ: "bg-green-100 text-green-700",
  REPLIED: "bg-purple-100 text-purple-700",
  FAILED: "bg-red-100 text-red-700",
};

const MSG_TYPE_LABELS: Record<string, string> = {
  CONFIRMATION: "Confirmation",
  REMINDER_24H: "24h Reminder",
  REMINDER_2H: "2h Reminder",
  FOLLOW_UP: "Follow-up",
  RECALL: "Recall",
  NO_SHOW_RECOVERY: "No-show Recovery",
  MANUAL: "Manual",
};

const PREVIEW_VARS: Record<string, string> = {
  patient_name: "Mohammed Benali",
  clinic_name: "Clinique Al Shifa",
  appointment_date: "15/06/2026",
  appointment_time: "10:30",
  appointment_day: "lundi",
  doctor_name: "Dr. Sarah Mansour",
  service_name: "Consultation générale",
  clinic_address: "12 Rue Didouche Mourad, Alger",
  clinic_phone: "+213 555 123 456",
};

export default function WhatsAppSettingsPage() {
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<TabKey>("connection");
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [activeTemplateKey, setActiveTemplateKey] = useState<TemplateKey>("confirmTemplate");
  const [testPhone, setTestPhone] = useState("");
  const [pollInterval, setPollInterval] = useState<number | false>(false);

  const { data: config } = trpc.whatsapp.getConfig.useQuery(undefined, { refetchOnWindowFocus: false });

  const { data: instanceStatus, refetch: refetchStatus } = trpc.whatsapp.getInstanceStatus.useQuery(
    undefined,
    { refetchInterval: pollInterval }
  );

  useEffect(() => {
    if ((instanceStatus as any)?.status === "connecting") setPollInterval(5000);
    else setPollInterval(false);
  }, [(instanceStatus as any)?.status]);

  const [templates, setTemplates] = useState<Record<TemplateKey, string>>({
    confirmTemplate: "",
    reminder24hTemplate: "",
    reminder2hTemplate: "",
    followUpTemplate: "",
    noShowRecoveryTemplate: "",
    recallTemplate: "",
  });

  const [automation, setAutomation] = useState({
    autoConfirm: true,
    autoReminder24h: true,
    autoReminder2h: true,
    autoFollowUp: true,
    autoNoShowRecovery: false,
    autoRecall: false,
    recallDays: 180,
  });

  useEffect(() => {
    if (!config) return;
    setTemplates({
      confirmTemplate: config.confirmTemplate ?? "",
      reminder24hTemplate: config.reminder24hTemplate ?? "",
      reminder2hTemplate: config.reminder2hTemplate ?? "",
      followUpTemplate: config.followUpTemplate ?? "",
      noShowRecoveryTemplate: (config as any).noShowRecoveryTemplate ?? "",
      recallTemplate: (config as any).recallTemplate ?? "",
    });
    setAutomation({
      autoConfirm: (config as any).autoConfirm ?? true,
      autoReminder24h: config.autoReminder24h,
      autoReminder2h: config.autoReminder2h,
      autoFollowUp: config.autoFollowUp,
      autoNoShowRecovery: (config as any).autoNoShowRecovery ?? false,
      autoRecall: config.autoRecall,
      recallDays: config.recallDays,
    });
  }, [config]);

  const updateConfig = trpc.whatsapp.updateConfig.useMutation({
    onSuccess: () => { toast({ title: "Settings saved", variant: "success" }); utils.whatsapp.getConfig.invalidate(); },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const createInstance = trpc.whatsapp.createInstance.useMutation({
    onSuccess: () => { toast({ title: "Scan the QR code to connect", variant: "success" }); refetchStatus(); setPollInterval(5000); },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const disconnectInstance = trpc.whatsapp.disconnectInstance.useMutation({
    onSuccess: () => { toast({ title: "Disconnected", variant: "success" }); refetchStatus(); },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const restartInstance = trpc.whatsapp.restartInstance.useMutation({
    onSuccess: () => { toast({ title: "Restarting…", variant: "success" }); setTimeout(() => refetchStatus(), 3000); },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const sendTest = trpc.whatsapp.sendTestMessage.useMutation({
    onSuccess: () => toast({ title: "Test message sent!", variant: "success" }),
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const resetTemplates = trpc.whatsapp.resetTemplates.useMutation({
    onSuccess: () => { toast({ title: "Templates reset", variant: "success" }); utils.whatsapp.getConfig.invalidate(); },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const { data: history } = trpc.whatsapp.getMessageHistory.useQuery(
    { page: 1, limit: 50 },
    { enabled: tab === "history" }
  );

  const { data: analytics } = trpc.whatsapp.getAnalytics.useQuery(
    { period: "month" },
    { enabled: tab === "history" }
  );

  const handlePreview = useCallback(() => {
    const current = templates[activeTemplateKey];
    if (!current) return;
    let rendered = current;
    for (const [k, v] of Object.entries(PREVIEW_VARS)) {
      rendered = rendered.replaceAll(`{${k}}`, v);
    }
    setPreviewTemplate(rendered);
  }, [templates, activeTemplateKey]);

  const connected = (instanceStatus as any)?.connected ?? false;
  const connecting = (instanceStatus as any)?.status === "connecting";
  const qrCode = (instanceStatus as any)?.qrCode as string | null | undefined;

  const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: "connection", label: "Connection", icon: Wifi },
    { key: "automation", label: "Automation", icon: ToggleRight },
    { key: "templates", label: "Templates", icon: FileText },
    { key: "history", label: "History", icon: History },
  ];

  const AUTOMATION_ITEMS: { key: keyof typeof automation; label: string; sub: string; icon: string }[] = [
    { key: "autoConfirm", label: "Auto-send confirmation request", sub: "Immediately after booking", icon: "📋" },
    { key: "autoReminder24h", label: "24h reminder", sub: "24 hours before appointment", icon: "🔔" },
    { key: "autoReminder2h", label: "2h reminder", sub: "2 hours before appointment", icon: "⏰" },
    { key: "autoFollowUp", label: "Follow-up message", sub: "24 hours after appointment", icon: "🙏" },
    { key: "autoNoShowRecovery", label: "No-show recovery", sub: "1 hour after missed appointment", icon: "😕" },
    { key: "autoRecall", label: "Recall messages", sub: `Every ${automation.recallDays} days for inactive patients`, icon: "👋" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-green-600" />
            WhatsApp Automation
          </h1>
          <p className="text-gray-500 text-sm">Automated confirmations, reminders &amp; follow-ups</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0",
          connected ? "bg-green-100 text-green-700" : connecting ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
        )}>
          {connected ? <Wifi className="h-4 w-4" /> : connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
          {connected ? "Connected" : connecting ? "Connecting…" : "Not connected"}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all",
              tab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── CONNECTION ────────────────────────────────────────────────────────── */}
      {tab === "connection" && (
        <div className="space-y-4">
          <div className={cn(
            "rounded-2xl border-2 p-8 flex flex-col items-center text-center gap-5",
            connected ? "border-green-200 bg-green-50" :
            connecting ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center",
              connected ? "bg-green-100" : connecting ? "bg-amber-100" : "bg-gray-100"
            )}>
              {connected
                ? <CheckCircle2 className="h-10 w-10 text-green-600" />
                : connecting
                ? <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                : <XCircle className="h-10 w-10 text-gray-400" />}
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {connected ? "WhatsApp Connected ✅" : connecting ? "Waiting for QR scan…" : "Not Connected"}
              </h2>
              {connected && (instanceStatus as any)?.phoneNumber && (
                <p className="text-green-700 font-medium mt-1.5 flex items-center justify-center gap-1.5">
                  <Phone className="h-4 w-4" /> +{(instanceStatus as any).phoneNumber}
                </p>
              )}
              {!connected && !connecting && (
                <p className="text-gray-500 text-sm mt-1.5 max-w-sm">
                  Connect your clinic&apos;s WhatsApp Business number to send automated messages.
                </p>
              )}
            </div>

            {qrCode && (connecting || !connected) && (
              <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="WhatsApp QR Code" className="w-52 h-52 object-contain" />
                <p className="text-xs text-gray-400 mt-2">Refreshes automatically after scan</p>
              </div>
            )}

            {connecting && (
              <div className="text-left bg-white rounded-xl border border-amber-200 p-4 max-w-sm w-full">
                <p className="font-semibold text-sm text-gray-900 mb-2">How to scan:</p>
                <ol className="space-y-1 text-sm text-gray-600 list-decimal list-inside">
                  <li>Open WhatsApp on your phone</li>
                  <li>Tap Settings → Linked Devices</li>
                  <li>Tap &ldquo;Link a Device&rdquo;</li>
                  <li>Point your camera at the QR code above</li>
                </ol>
              </div>
            )}

            <div className="flex gap-3 flex-wrap justify-center">
              {!connected && !connecting && (
                <Button
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  disabled={createInstance.isPending}
                  onClick={() => createInstance.mutate()}
                >
                  {createInstance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Connect WhatsApp
                </Button>
              )}
              {!connected && !connecting && config?.instanceName && (
                <Button variant="outline" onClick={() => { refetchStatus(); setPollInterval(5000); }} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Show QR Code
                </Button>
              )}
              {(connected || connecting) && (
                <>
                  <Button variant="outline" disabled={restartInstance.isPending} onClick={() => restartInstance.mutate()} className="gap-2">
                    {restartInstance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Restart
                  </Button>
                  <Button
                    variant="outline"
                    disabled={disconnectInstance.isPending}
                    onClick={() => { if (confirm("This will stop all WhatsApp automation. Continue?")) disconnectInstance.mutate(); }}
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-2"
                  >
                    {disconnectInstance.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>

          {connected && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Send className="h-4 w-4 text-teal-600" /> Send Test Message
              </h3>
              <div className="flex gap-3">
                <Input placeholder="+213 555 000 000" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="flex-1" />
                <Button
                  disabled={!testPhone || sendTest.isPending}
                  onClick={() => sendTest.mutate({ phoneNumber: testPhone, template: "🧪 Test from *Clinomatic* — WhatsApp automation is working! ✅" })}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {sendTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── AUTOMATION ────────────────────────────────────────────────────────── */}
      {tab === "automation" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {AUTOMATION_ITEMS.map(({ key, label, sub, icon }) => (
              <div key={key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutomation((p) => ({ ...p, [key]: typeof p[key] === "boolean" ? !p[key] : p[key] }))}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
                    typeof automation[key] === "boolean" && automation[key] ? "bg-teal-600" : "bg-gray-200"
                  )}
                  role="switch"
                  aria-checked={typeof automation[key] === "boolean" ? automation[key] as boolean : false}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                    typeof automation[key] === "boolean" && automation[key] ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            ))}
            {automation.autoRecall && (
              <div className="bg-gray-50 px-5 py-3 flex items-center gap-4">
                <Label className="text-sm text-gray-700 flex-shrink-0">Recall after:</Label>
                <input
                  type="number"
                  min={30}
                  max={730}
                  value={automation.recallDays}
                  onChange={(e) => setAutomation((p) => ({ ...p, recallDays: parseInt(e.target.value) || 180 }))}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}
          </div>
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={updateConfig.isPending}
            onClick={() => updateConfig.mutate(automation)}
          >
            {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Automation Settings
          </Button>
        </div>
      )}

      {/* ── TEMPLATES ─────────────────────────────────────────────────────────── */}
      {tab === "templates" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            {TEMPLATE_KEYS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTemplateKey(key)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
                  activeTemplateKey === key
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-teal-300"
                )}
              >
                <span>{icon}</span>{label}
              </button>
            ))}
            <Button
              variant="outline"
              onClick={() => resetTemplates.mutate()}
              disabled={resetTemplates.isPending}
              className="w-full mt-2 gap-2 text-sm text-gray-600"
            >
              {resetTemplates.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset All to Default
            </Button>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">Click to insert variable:</p>
              <div className="flex flex-wrap gap-1.5">
                {["patient_name","clinic_name","appointment_date","appointment_time","appointment_day","doctor_name","service_name","clinic_address","clinic_phone"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("tmpl-editor") as HTMLTextAreaElement | null;
                      if (!el) return;
                      const s = el.selectionStart;
                      const e = el.selectionEnd;
                      const cur = templates[activeTemplateKey];
                      const next = cur.slice(0, s) + `{${v}}` + cur.slice(e);
                      setTemplates((p) => ({ ...p, [activeTemplateKey]: next }));
                      setTimeout(() => { el.focus(); el.setSelectionRange(s + v.length + 2, s + v.length + 2); }, 0);
                    }}
                    className="px-2 py-0.5 bg-white text-blue-700 text-xs rounded border border-blue-200 hover:bg-blue-100 font-mono"
                  >
                    {`{${v}}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block font-medium text-sm">
                {TEMPLATE_KEYS.find((k) => k.key === activeTemplateKey)?.icon}{" "}
                {TEMPLATE_KEYS.find((k) => k.key === activeTemplateKey)?.label}
              </Label>
              <textarea
                id="tmpl-editor"
                rows={10}
                value={templates[activeTemplateKey]}
                onChange={(e) => setTemplates((p) => ({ ...p, [activeTemplateKey]: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                placeholder="Write your message template here…"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePreview} className="gap-2 flex-1">
                <Eye className="h-4 w-4" /> Preview
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 flex-1"
                disabled={updateConfig.isPending}
                onClick={() => updateConfig.mutate(templates as any)}
              >
                {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Templates
              </Button>
            </div>

            {connected && (
              <div className="border border-dashed border-gray-300 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Test this template:</p>
                <div className="flex gap-2">
                  <Input placeholder="+213 555 000 000" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="flex-1" />
                  <Button
                    disabled={!testPhone || sendTest.isPending}
                    onClick={() => sendTest.mutate({ phoneNumber: testPhone, template: templates[activeTemplateKey] })}
                    className="gap-1.5 bg-teal-600 hover:bg-teal-700"
                  >
                    {sendTest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY ───────────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-5">
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Sent", value: (analytics as any).total ?? 0, icon: MessageSquare, color: "text-gray-700" },
                { label: "Delivery Rate", value: `${(analytics as any).deliveryRate ?? 0}%`, icon: CheckCircle2, color: "text-teal-700" },
                { label: "Read Rate", value: `${(analytics as any).readRate ?? 0}%`, icon: Eye, color: "text-purple-700" },
                { label: "Failed", value: (analytics as any).failed ?? 0, icon: XCircle, color: "text-red-700" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <Icon className={cn("h-5 w-5 mb-2 opacity-80", color)} />
                  <p className={cn("text-2xl font-bold", color)}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label} (30d)</p>
                </div>
              ))}
            </div>
          )}

          {analytics && (analytics as any).byType && Object.keys((analytics as any).byType).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">Messages by Type</h3>
              <div className="space-y-2">
                {Object.entries((analytics as any).byType as Record<string, number>).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3 text-sm">
                    <span className="w-36 text-gray-600 flex-shrink-0 text-xs">{MSG_TYPE_LABELS[type] ?? type}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-teal-500 rounded-full"
                        style={{ width: `${Math.min(100, (count / Math.max((analytics as any).total, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-900 w-8 text-right text-xs">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Message Log</h3>
              <span className="text-xs text-gray-500">{(history as any)?.total ?? 0} total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Patient", "Type", "Dir", "Status", "Time"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {((history as any)?.messages ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                        No messages yet. Connect WhatsApp and book an appointment to start.
                      </td>
                    </tr>
                  ) : (
                    ((history as any)?.messages ?? []).map((msg: any) => (
                      <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-xs">{msg.patient?.name ?? "—"}</p>
                          <p className="text-xs text-gray-400">{msg.patient?.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {MSG_TYPE_LABELS[msg.messageType] ?? msg.messageType}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full",
                            msg.direction === "INBOUND" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                          )}>
                            {msg.direction === "INBOUND" ? "↙ IN" : "↗ OUT"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full", STATUS_COLORS[msg.status] ?? "bg-gray-100 text-gray-600")}>
                            {msg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {format(new Date(msg.sentAt), "dd/MM HH:mm", { locale: fr })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ─────────────────────────────────────────────────────── */}
      {previewTemplate !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-[#128C7E] rounded-full flex items-center justify-center text-white font-bold text-sm">C</div>
              <div>
                <p className="text-white font-semibold text-sm">Clinique Al Shifa</p>
                <p className="text-[#ACE8DF] text-xs">online</p>
              </div>
            </div>
            <div className="bg-[#e5ddd5] p-4 min-h-[200px] max-h-96 overflow-y-auto">
              <div className="bg-white rounded-lg rounded-tl-none px-4 py-3 shadow-sm max-w-[90%] inline-block">
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{previewTemplate}</p>
                <p className="text-[10px] text-gray-400 text-right mt-2">{format(new Date(), "HH:mm")} ✓✓</p>
              </div>
            </div>
            <div className="px-4 py-3 flex justify-end bg-white border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setPreviewTemplate(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
