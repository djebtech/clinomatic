"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { Loader2, Phone, MessageCircle, MessageSquare, Users, X, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PanelMode = "confirm" | "attempt" | "callback";

interface QueueItem {
  id: string;
  date: string | Date;
  patient: { name: string; phone: string } | null;
  service: { name: string } | null;
  doctor: { name: string } | null;
  clinic: { name: string } | null;
  confirmAttempts: number;
  priority: string;
}

interface Props {
  item: QueueItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmationPanel({ item, onClose, onSuccess }: Props) {
  const t = useT();

  const [mode, setMode] = useState<PanelMode>("confirm");
  const [method, setMethod] = useState("call");
  const [notes, setNotes] = useState("");
  const [sendReminders, setSendReminders] = useState(true);
  const [attemptType, setAttemptType] = useState("call_no_answer");
  const [callbackDate, setCallbackDate] = useState("");
  const [callbackTime, setCallbackTime] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");

  const utils = trpc.useUtils();

  const confirm = trpc.confirmationManager.confirmAppointment.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_panel.confirm_success"), variant: "success" });
      utils.confirmationManager.getMyQueue.invalidate();
      utils.confirmationManager.getMyStats.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const logAttempt = trpc.confirmationManager.recordAttempt.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_panel.attempt_success"), variant: "success" });
      utils.confirmationManager.getMyQueue.invalidate();
      setNotes("");
      onSuccess();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  const scheduleCallback = trpc.confirmationManager.scheduleCallback.useMutation({
    onSuccess: () => {
      toast({ title: t("confirmation_panel.callback_success"), variant: "success" });
      utils.confirmationManager.getMyQueue.invalidate();
      onSuccess();
      onClose();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  if (!item) return null;

  const priorityColor = {
    urgent: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-amber-100 text-amber-700 border-amber-200",
    normal: "bg-green-100 text-green-700 border-green-200",
  }[item.priority] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="font-bold text-gray-900 text-lg">{t("confirmation_panel.title")}</h2>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border mt-1 inline-block", priorityColor)}>
            {item.priority.toUpperCase()}
          </span>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Appointment Info */}
      <div className="px-5 py-4 bg-teal-50 border-b border-teal-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
            {(item.patient?.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{item.patient?.name ?? "—"}</p>
            <p className="text-sm text-teal-700 font-medium">{item.patient?.phone}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            {format(new Date(item.date), "EEE d MMM", { locale: fr })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            {format(new Date(item.date), "HH:mm")}
          </div>
          <div className="col-span-2 truncate">{item.service?.name}</div>
          {item.clinic && <div className="col-span-2 text-teal-600">{item.clinic.name}</div>}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {item.confirmAttempts} {t("agent_queue.attempts")}
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-gray-200">
        {(["confirm", "attempt", "callback"] as PanelMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 py-2.5 text-xs font-semibold transition-colors",
              mode === m
                ? "border-b-2 border-teal-600 text-teal-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {m === "confirm" && t("agent_queue.confirm_btn")}
            {m === "attempt" && t("agent_queue.attempt_btn")}
            {m === "callback" && t("agent_queue.callback_btn")}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* CONFIRM MODE */}
        {mode === "confirm" && (
          <>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.method")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "call", label: t("confirmation_panel.method_call"), icon: Phone },
                  { value: "whatsapp", label: t("confirmation_panel.method_whatsapp"), icon: MessageCircle },
                  { value: "sms", label: t("confirmation_panel.method_sms"), icon: MessageSquare },
                  { value: "in_person", label: t("confirmation_panel.method_inperson"), icon: Users },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                      method === value
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.notes")}</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("confirmation_panel.notes_placeholder")}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sendReminders}
                onChange={(e) => setSendReminders(e.target.checked)}
                className="accent-teal-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">{t("confirmation_panel.send_reminders")}</span>
            </label>
          </>
        )}

        {/* ATTEMPT MODE */}
        {mode === "attempt" && (
          <>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.attempt_type")}</Label>
              <Select value={attemptType} onValueChange={setAttemptType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call_no_answer">{t("confirmation_panel.attempt_call")}</SelectItem>
                  <SelectItem value="whatsapp_sent">{t("confirmation_panel.attempt_whatsapp")}</SelectItem>
                  <SelectItem value="sms_sent">{t("confirmation_panel.attempt_sms")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.attempt_notes")}</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </>
        )}

        {/* CALLBACK MODE */}
        {mode === "callback" && (
          <>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.callback_date")}</Label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={callbackDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium">{t("confirmation_panel.callback_notes")}</Label>
              <textarea
                value={callbackNotes}
                onChange={(e) => setCallbackNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer Action */}
      <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
        {mode === "confirm" && (
          <Button
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate({
                appointmentId: item.id,
                confirmMethod: method,
                notes: notes || undefined,
                sendReminders,
              })
            }
          >
            {confirm.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {confirm.isPending ? t("confirmation_panel.confirming") : t("confirmation_panel.confirm_btn")}
          </Button>
        )}
        {mode === "attempt" && (
          <Button
            className="w-full"
            variant="outline"
            disabled={logAttempt.isPending}
            onClick={() =>
              logAttempt.mutate({
                appointmentId: item.id,
                attemptType: attemptType as "call_no_answer" | "whatsapp_sent" | "sms_sent",
                notes: notes || undefined,
              })
            }
          >
            {logAttempt.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("confirmation_panel.log_attempt")}
          </Button>
        )}
        {mode === "callback" && (
          <Button
            className="w-full"
            disabled={scheduleCallback.isPending || !callbackDate || !callbackTime}
            onClick={() => {
              const dt = new Date(`${callbackDate}T${callbackTime}`);
              scheduleCallback.mutate({
                appointmentId: item.id,
                scheduledFor: dt.toISOString(),
                notes: callbackNotes || undefined,
              });
            }}
          >
            {scheduleCallback.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("confirmation_panel.schedule_callback")}
          </Button>
        )}
      </div>
    </div>
  );
}
