"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  ArrowLeft, Phone, Calendar, Pencil,
  HeartPulse, FileText, MessageCircle, Plus, Trash2,
  Users, DollarSign, TrendingUp, Clock,
} from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { useT } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

function InfoRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-sm font-medium text-teal-600 hover:underline text-right">{value}</a>
      ) : (
        <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
      )}
    </div>
  );
}

function NoteComposer({ patientId, onAdded }: { patientId: string; onAdded: () => void }) {
  const t = useT();
  const [content, setContent] = useState("");
  const addNote = trpc.patient.addNote.useMutation({
    onSuccess: () => {
      toast({ title: "Note ajoutée", variant: "success" });
      setContent("");
      onAdded();
    },
  });

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={t("patients.add_note") + "..."}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />
      <Button
        size="sm"
        onClick={() => addNote.mutate({ patientId, content })}
        disabled={!content.trim() || addNote.isPending}
        className="gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("patients.add_note")}
      </Button>
    </div>
  );
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const utils = trpc.useUtils();

  const { data: patient, isLoading } = trpc.patient.getById.useQuery({ id });

  const deleteNoteMut = trpc.patient.deleteNote.useMutation({
    onSuccess: () => {
      toast({ title: "Note supprimée", variant: "success" });
      utils.patient.getById.invalidate({ id });
    },
  });

  if (isLoading) return <PageLoader />;
  if (!patient) return <div className="text-center py-12 text-gray-500">{t("common.no_results")}</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = patient as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalSpent = p.appointments.filter((a: any) => a.paid).reduce((s: number, a: any) => s + a.price, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attended = p.appointments.filter((a: any) => a.status === "ATTENDED").length;
  const attendanceRate = p.appointments.length > 0 ? Math.round((attended / p.appointments.length) * 100) : 0;

  return (
    <div className="max-w-5xl space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/patients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-base">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{p.name}</h1>
              <p className="text-gray-500 text-xs">#{p.id.slice(-8)}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/appointments/new?patientId=${p.id}`} className="gap-1">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{t("patients.book_appointment")}</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${p.id}/edit`} className="gap-1">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">{t("common.edit")}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Calendar, label: t("patients.total_visits"), value: p._count.appointments, color: "text-blue-600 bg-blue-50" },
          { icon: DollarSign, label: t("patients.total_spent"), value: formatCurrency(totalSpent), color: "text-green-600 bg-green-50" },
          { icon: TrendingUp, label: t("patients.attendance_rate"), value: `${attendanceRate}%`, color: "text-teal-600 bg-teal-50" },
          { icon: Clock, label: t("patients.last_visit"), value: p.lastVisit ? formatDate(p.lastVisit) : t("patients.never_visited"), color: "text-gray-600 bg-gray-50" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          <TabsTrigger value="overview">{t("patients.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="appointments">{t("patients.tabs.appointments")}</TabsTrigger>
          <TabsTrigger value="medical">{t("patients.tabs.medical")}</TabsTrigger>
          <TabsTrigger value="notes">{t("patients.tabs.notes")}</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />{t("patients.personal_info")}
              </h3>
              <InfoRow label={t("patients.phone")} value={p.phone} href={`tel:${p.phone}`} />
              <InfoRow label={t("common.email")} value={p.email} href={p.email ? `mailto:${p.email}` : undefined} />
              <InfoRow label={t("patients.date_of_birth")} value={p.dateOfBirth ? formatDate(p.dateOfBirth) : undefined} />
              <InfoRow label={t("patients.gender")} value={p.gender ? t(`patients.${p.gender.toLowerCase()}`) : undefined} />
              <InfoRow label={t("common.city")} value={p.city} />
              <InfoRow label={t("common.address")} value={p.address} />
              <InfoRow label={t("common.source")} value={p.source ? t(`patients.sources.${p.source}`) : undefined} />
              {p.tags.length > 0 && (
                <div className="flex items-start justify-between gap-4 py-2">
                  <span className="text-sm text-gray-500">{t("common.tags")}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {p.tags.map((tag: string) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-purple-600" />{t("patients.consent")}
              </h3>
              {[
                { label: t("patients.consent_sms"), value: p.consentSMS },
                { label: t("patients.consent_whatsapp"), value: p.consentWhatsApp },
                { label: t("patients.consent_marketing"), value: p.consentMarketing },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                    {value ? t("common.yes") : t("common.no")}
                  </span>
                </div>
              ))}
              {p.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{t("common.notes")}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.notes}</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Appointments ── */}
        <TabsContent value="appointments">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {p.appointments.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>{t("appointments.no_appointments")}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {p.appointments.map((apt: any) => (
                  <Link
                    key={apt.id}
                    href={`/appointments/${apt.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-900">{apt.service.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(apt.date)}</p>
                      {apt.doctor && <p className="text-xs text-gray-400 mt-0.5">Dr. {apt.doctor.name}</p>}
                    </div>
                    <div className="text-right">
                      <StatusBadge status={apt.status} />
                      <p className="text-xs text-gray-500 mt-1">{formatCurrency(apt.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Medical ── */}
        <TabsContent value="medical">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-red-500" />{t("patients.medical_info")}
            </h3>
            <InfoRow label={t("patients.blood_type")} value={p.bloodType} />
            <InfoRow label={t("patients.allergies")} value={p.allergies} />
            <InfoRow label={t("patients.chronic_conditions")} value={p.chronicConditions} />
            <InfoRow label={t("patients.current_medications")} value={p.currentMedications} />
            <InfoRow label={t("patients.emergency_contact_name")} value={p.emergencyContactName} />
            <InfoRow label={t("patients.emergency_contact_phone")} value={p.emergencyContactPhone} href={p.emergencyContactPhone ? `tel:${p.emergencyContactPhone}` : undefined} />
            {!p.bloodType && !p.allergies && !p.chronicConditions && !p.currentMedications && !p.emergencyContactName && (
              <p className="text-gray-400 text-sm py-6 text-center">Aucune information médicale enregistrée</p>
            )}
          </div>
        </TabsContent>

        {/* ── Notes ── */}
        <TabsContent value="notes">
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />{t("patients.add_note")}
              </h3>
              <NoteComposer
                patientId={p.id}
                onAdded={() => utils.patient.getById.invalidate({ id })}
              />
            </div>

            {p.notes_list.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">{t("patients.no_notes")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(p.notes_list as Array<{
                  id: string;
                  content: string;
                  createdAt: Date | string;
                  author: { name: string };
                }>).map((note) => (
                  <div key={note.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs">
                          {note.author.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{note.author.name}</span>
                        <span className="text-xs text-gray-400">{formatDateTime(note.createdAt)}</span>
                      </div>
                      <button
                        onClick={() => deleteNoteMut.mutate({ noteId: note.id, patientId: p.id })}
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
