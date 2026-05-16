"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { useT } from "@/contexts/LanguageContext";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  User, Clock, Stethoscope, Tag, CreditCard, FileText,
  CheckCircle2, XCircle, Calendar, MessageCircle, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  appointmentId: string | null;
  onClose: () => void;
  onRefresh?: () => void;
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  CREATED: <Calendar className="h-4 w-4 text-teal-600" />,
  CONFIRMED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  ATTENDED: <CheckCircle2 className="h-4 w-4 text-blue-600" />,
  NO_SHOW: <XCircle className="h-4 w-4 text-red-600" />,
  CANCELLED: <XCircle className="h-4 w-4 text-gray-500" />,
  RESCHEDULED: <Calendar className="h-4 w-4 text-purple-600" />,
};

type TabKey = "overview" | "timeline" | "messages";

export function AppointmentDetailModal({ appointmentId, onClose, onRefresh }: Props) {
  const t = useT();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabKey>("overview");
  const [noShowReason, setNoShowReason] = useState("no_answer");
  const [cancelReason, setCancelReason] = useState("patient");

  const { data: apt, isLoading } = trpc.appointment.getById.useQuery(
    { id: appointmentId! },
    { enabled: !!appointmentId }
  );

  const markAttended = trpc.appointment.markAttended.useMutation({
    onSuccess: () => {
      toast({ title: t("appointments.attended_success"), variant: "success" });
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      onRefresh?.();
    },
  });

  const markNoShow = trpc.appointment.markNoShow.useMutation({
    onSuccess: () => {
      toast({ title: t("appointments.no_show_success"), variant: "success" });
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      onRefresh?.();
    },
  });

  const cancel = trpc.appointment.cancel.useMutation({
    onSuccess: () => {
      toast({ title: t("appointments.cancel_success"), variant: "success" });
      utils.appointment.list.invalidate();
      utils.appointment.stats.invalidate();
      onRefresh?.();
    },
  });

  const markPaid = trpc.appointment.markPaid.useMutation({
    onSuccess: () => {
      toast({ title: t("common.success"), variant: "success" });
      utils.appointment.getById.invalidate({ id: appointmentId! });
    },
  });

  if (!appointmentId) return null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: t("appointments.tab_overview") },
    { key: "timeline", label: t("appointments.tab_timeline") },
    { key: "messages", label: t("appointments.tab_messages") },
  ];

  const canMarkAttended =
    apt && ["CONFIRMED", "PENDING", "CONFIRMING"].includes(apt.status);
  const canMarkNoShow =
    apt && ["CONFIRMED", "PENDING", "CONFIRMING"].includes(apt.status);
  const canCancel = apt && !["CANCELLED", "ATTENDED"].includes(apt.status);

  return (
    <Dialog open={!!appointmentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading || !apt ? (
          <PageLoader />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base">{t("appointments.detail_title")}</DialogTitle>
                <StatusBadge status={apt.status} />
              </div>
              <p className="text-xs text-gray-400">#{apt.id.slice(-8).toUpperCase()}</p>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 gap-4">
              {tabs.map((tb) => (
                <button
                  key={tb.key}
                  onClick={() => setTab(tb.key)}
                  className={cn(
                    "pb-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                    tab === tb.key
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tb.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ── */}
            {tab === "overview" && (
              <div className="space-y-4">
                {/* Date/Time big card */}
                <div className="bg-teal-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-teal-800">
                    {format(new Date(apt.date), "EEEE d MMMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-lg text-teal-700 font-semibold">
                    {format(new Date(apt.date), "HH:mm")} — {apt.duration} min
                  </p>
                </div>

                {/* Info rows */}
                <div className="space-y-3">
                  {/* Patient */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <User className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{t("appointments.step_patient")}</p>
                      <p className="font-semibold text-sm">{(apt.patient as any).name}</p>
                      <p className="text-xs text-gray-500">{(apt.patient as any).phone}</p>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <div
                      className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: (apt.service as any).color || "#0d9488" }}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{t("appointments.col_service")}</p>
                      <p className="font-semibold text-sm">{(apt.service as any).name}</p>
                      <p className="text-xs text-gray-500">{(apt.service as any).duration} min · {(apt.service as any).price?.toLocaleString()} DA</p>
                    </div>
                  </div>

                  {/* Doctor */}
                  {apt.doctor && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                      <Stethoscope className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">{t("appointments.col_doctor")}</p>
                        <p className="font-semibold text-sm">Dr. {(apt.doctor as any).name}</p>
                        {(apt.doctor as any).specialty && (
                          <p className="text-xs text-gray-500">{(apt.doctor as any).specialty}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Source */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">{t("appointments.col_source")}</p>
                      <p className="font-semibold text-sm capitalize">{apt.source}</p>
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                    <CreditCard className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">{t("appointments.payment_status")}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.paid ? "success" : "secondary"}>
                          {apt.paid ? t("appointments.payment_paid") : t("appointments.payment_not_paid")}
                        </Badge>
                        {apt.paid && apt.paymentMethod && (
                          <span className="text-xs text-gray-500 capitalize">{apt.paymentMethod}</span>
                        )}
                      </div>
                      {!apt.paid && (
                        <button
                          className="text-xs text-teal-600 hover:underline mt-1"
                          onClick={() => markPaid.mutate({ id: apt.id })}
                        >
                          {t("appointments.mark_paid")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {apt.notes && (
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">{t("common.notes")}</p>
                        <p className="text-sm text-gray-700">{apt.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {canMarkAttended && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={markAttended.isPending}
                      onClick={() => markAttended.mutate({ id: apt.id })}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("appointments.mark_attended")}
                    </Button>
                  )}
                  {canMarkNoShow && (
                    <div className="flex items-center gap-1">
                      <Select value={noShowReason} onValueChange={setNoShowReason}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_answer">{t("appointments.no_show_no_answer")}</SelectItem>
                          <SelectItem value="last_minute">{t("appointments.no_show_last_minute")}</SelectItem>
                          <SelectItem value="unknown">{t("appointments.no_show_unknown")}</SelectItem>
                          <SelectItem value="other">{t("appointments.no_show_other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                        disabled={markNoShow.isPending}
                        onClick={() => markNoShow.mutate({ id: apt.id, reason: noShowReason })}
                      >
                        <XCircle className="h-4 w-4" />
                        {t("appointments.mark_no_show")}
                      </Button>
                    </div>
                  )}
                  {canCancel && (
                    <div className="flex items-center gap-1">
                      <Select value={cancelReason} onValueChange={setCancelReason}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">{t("appointments.cancel_patient")}</SelectItem>
                          <SelectItem value="doctor">{t("appointments.cancel_doctor")}</SelectItem>
                          <SelectItem value="clinic">{t("appointments.cancel_clinic")}</SelectItem>
                          <SelectItem value="duplicate">{t("appointments.cancel_duplicate")}</SelectItem>
                          <SelectItem value="other">{t("appointments.cancel_other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 h-8"
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate({ id: apt.id, reason: cancelReason })}
                      >
                        {t("appointments.cancel")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Timeline tab ── */}
            {tab === "timeline" && (
              <div className="space-y-3">
                {(apt as any).timeline?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">{t("appointments.no_timeline")}</p>
                ) : (
                  (apt as any).timeline?.map((entry: any) => (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border flex items-center justify-center flex-shrink-0">
                        {TIMELINE_ICONS[entry.action] ?? <Clock className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                        {entry.user && (
                          <p className="text-xs text-gray-500">{entry.user.name}</p>
                        )}
                        {entry.details && typeof entry.details === "object" && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(entry.details as Record<string, unknown>)
                              .filter(([, v]) => v !== null && v !== false)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(entry.createdAt), "d MMM yyyy HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Messages tab ── */}
            {tab === "messages" && (
              <div className="space-y-3">
                {(apt as any).whatsappMessages?.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun message envoyé</p>
                ) : (
                  (apt as any).whatsappMessages?.map((msg: any) => (
                    <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <MessageCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-xs">{msg.messageType}</Badge>
                          <Badge variant={msg.status === "READ" ? "success" : "secondary"} className="text-xs">
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">{msg.content}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(msg.sentAt), "d MMM HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
