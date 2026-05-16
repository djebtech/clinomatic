"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  appointmentId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RescheduleModal({ appointmentId, onClose, onSuccess }: Props) {
  const t = useT();
  const utils = trpc.useUtils();

  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("patient_request");
  const [notify, setNotify] = useState(true);

  const { data: apt } = trpc.appointment.getById.useQuery(
    { id: appointmentId! },
    { enabled: !!appointmentId }
  );

  const reschedule = trpc.appointment.reschedule.useMutation({
    onSuccess: () => {
      toast({ title: t("appointments.reschedule_success"), variant: "success" });
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      onClose();
      onSuccess?.();
    },
    onError: (err) => toast({ title: err.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newTime || !appointmentId) return;
    const dateTime = new Date(`${newDate}T${newTime}`);
    reschedule.mutate({
      id: appointmentId,
      newDate: dateTime.toISOString(),
      reason,
      notifyPatient: notify,
    });
  }

  return (
    <Dialog open={!!appointmentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("appointments.reschedule_title")}</DialogTitle>
        </DialogHeader>

        {apt && (
          <div className="bg-gray-50 rounded-lg p-3 text-sm mb-2">
            <p className="text-xs text-gray-500 mb-1">{t("appointments.reschedule_current")}</p>
            <p className="font-semibold">
              {format(new Date((apt as any).date), "EEEE d MMMM yyyy · HH:mm", { locale: fr })}
            </p>
            <p className="text-gray-600">{(apt as any).patient?.name} · {(apt as any).service?.name}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block">{t("appointments.reschedule_new_datetime")} *</Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                required
                min={new Date().toISOString().split("T")[0]}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
              <Input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">{t("appointments.reschedule_reason")}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient_request">{t("appointments.reschedule_patient_request")}</SelectItem>
                <SelectItem value="doctor">{t("appointments.reschedule_doctor")}</SelectItem>
                <SelectItem value="clinic">{t("appointments.reschedule_clinic")}</SelectItem>
                <SelectItem value="other">{t("appointments.reschedule_other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="accent-teal-600 w-4 h-4"
            />
            <span className="text-sm">{t("appointments.notify_patient")}</span>
          </label>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={reschedule.isPending} className="flex-1">
              {reschedule.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("appointments.reschedule")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
