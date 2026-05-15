"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import Link from "next/link";
import {
  Search, UserPlus, Phone, Calendar, Users, TrendingUp,
  ChevronLeft, ChevronRight, Pencil, Trash2, Share2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useT } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type FormData = {
  name: string; phone: string; email: string; dateOfBirth: string;
  gender: string; address: string; city: string; notes: string; source: string; tags: string;
  bloodType: string; allergies: string; chronicConditions: string; currentMedications: string;
  emergencyContactName: string; emergencyContactPhone: string;
  consentSMS: boolean; consentWhatsApp: boolean; consentMarketing: boolean;
};

const emptyForm: FormData = {
  name: "", phone: "", email: "", dateOfBirth: "", gender: "", address: "", city: "",
  notes: "", source: "", tags: "", bloodType: "", allergies: "", chronicConditions: "",
  currentMedications: "", emergencyContactName: "", emergencyContactPhone: "",
  consentSMS: true, consentWhatsApp: true, consentMarketing: false,
};

const SOURCES = ["instagram", "facebook", "whatsapp", "phone", "walkin", "referral", "website", "other"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function SourceIcon({ source }: { source?: string | null }) {
  if (source === "instagram" || source === "facebook") return <Share2 className="h-3 w-3" />;
  return null;
}

function PatientFormModal({
  open, onClose, editId
}: {
  open: boolean; onClose: () => void; editId?: string;
}) {
  const t = useT();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [tab, setTab] = useState("personal");

  const { data: existing } = trpc.patient.getById.useQuery(
    { id: editId! },
    { enabled: !!editId }
  );

  // Populate form when editing an existing patient
  React.useEffect(() => {
    if (existing && editId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existing as any;
      setForm({
        name: data.name,
        phone: data.phone,
        email: data.email ?? "",
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
        gender: data.gender ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        notes: data.notes ?? "",
        source: data.source ?? "",
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : "",
        bloodType: data.bloodType ?? "",
        allergies: data.allergies ?? "",
        chronicConditions: data.chronicConditions ?? "",
        currentMedications: data.currentMedications ?? "",
        emergencyContactName: data.emergencyContactName ?? "",
        emergencyContactPhone: data.emergencyContactPhone ?? "",
        consentSMS: data.consentSMS ?? true,
        consentWhatsApp: data.consentWhatsApp ?? true,
        consentMarketing: data.consentMarketing ?? false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, editId]);

  const createMut = trpc.patient.create.useMutation({
    onSuccess: () => {
      toast({ title: t("patients.create_success") });
      utils.patient.list.invalidate();
      utils.patient.stats.invalidate();
      onClose();
      setForm(emptyForm);
    },
    onError: (e: { message?: string }) => {
      toast({ title: e.message === "phone_exists" ? t("patients.phone_exists") : t("common.error") });
    },
  });

  const updateMut = trpc.patient.update.useMutation({
    onSuccess: () => {
      toast({ title: t("patients.update_success") });
      utils.patient.list.invalidate();
      if (editId) utils.patient.getById.invalidate({ id: editId });
      onClose();
    },
    onError: (e: { message?: string }) => {
      toast({ title: e.message === "phone_exists" ? t("patients.phone_exists") : t("common.error") });
    },
  });

  function set(k: keyof FormData, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit() {
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: (form.gender as "MALE" | "FEMALE" | "OTHER") || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      notes: form.notes || undefined,
      source: form.source || undefined,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      bloodType: form.bloodType || undefined,
      allergies: form.allergies || undefined,
      chronicConditions: form.chronicConditions || undefined,
      currentMedications: form.currentMedications || undefined,
      emergencyContactName: form.emergencyContactName || undefined,
      emergencyContactPhone: form.emergencyContactPhone || undefined,
      consentSMS: form.consentSMS,
      consentWhatsApp: form.consentWhatsApp,
      consentMarketing: form.consentMarketing,
    };

    if (editId) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setForm(emptyForm); setTab("personal"); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? t("common.edit") : t("patients.new")} — {form.name || "…"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="personal">{t("patients.personal_info")}</TabsTrigger>
            <TabsTrigger value="medical">{t("patients.medical_info")}</TabsTrigger>
            <TabsTrigger value="consent">{t("patients.consent")}</TabsTrigger>
          </TabsList>

          {/* ── PERSONAL ── */}
          <TabsContent value="personal" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.name")} *</label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ahmed Benali" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.phone")} *</label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0555 000 000" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.email")}</label>
                <Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemple.com" type="email" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.date_of_birth")}</label>
                <Input value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} type="date" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.gender")}</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">—</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{t(`patients.${g.toLowerCase()}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.source")}</label>
                <select
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">—</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{t(`patients.sources.${s}`)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.city")}</label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Alger" />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.address")}</label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rue..." />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.tags")} <span className="text-gray-400 font-normal">(virgule)</span></label>
                <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="VIP, Diabétique..." />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("common.notes")}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── MEDICAL ── */}
          <TabsContent value="medical" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.blood_type")}</label>
                <select
                  value={form.bloodType}
                  onChange={(e) => set("bloodType", e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">—</option>
                  {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.emergency_contact_phone")}</label>
                <Input value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} placeholder="0555..." />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.emergency_contact_name")}</label>
                <Input value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.allergies")}</label>
                <textarea
                  value={form.allergies}
                  onChange={(e) => set("allergies", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.chronic_conditions")}</label>
                <textarea
                  value={form.chronicConditions}
                  onChange={(e) => set("chronicConditions", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-xs font-medium text-gray-700">{t("patients.current_medications")}</label>
                <textarea
                  value={form.currentMedications}
                  onChange={(e) => set("currentMedications", e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </TabsContent>

          {/* ── CONSENT ── */}
          <TabsContent value="consent" className="space-y-4">
            {[
              { key: "consentSMS" as keyof FormData, label: t("patients.consent_sms") },
              { key: "consentWhatsApp" as keyof FormData, label: t("patients.consent_whatsapp") },
              { key: "consentMarketing" as keyof FormData, label: t("patients.consent_marketing") },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{label}</span>
                <Switch
                  checked={form[key] as boolean}
                  onCheckedChange={(v) => set(key, v)}
                />
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setForm(emptyForm); setTab("personal"); }}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.phone || isLoading}>
            {isLoading ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientsPage() {
  const t = useT();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | undefined>();

  const { data, isLoading } = trpc.patient.list.useQuery({ search, source: source || undefined, page, limit: 20 });
  const { data: stats } = trpc.patient.stats.useQuery();

  const patients = data?.patients ?? [];
  const totalPages = data?.totalPages ?? 1;

  const deleteMut = trpc.patient.delete.useMutation({
    onSuccess: () => {
      toast({ title: t("patients.delete_success") });
      utils.patient.list.invalidate();
      utils.patient.stats.invalidate();
      setDeleteId(undefined);
    },
  });

  function openNew() { setEditId(undefined); setModalOpen(true); }
  function openEdit(id: string) { setEditId(id); setModalOpen(true); }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t("patients.title")}</h1>
          <p className="text-gray-500 text-xs md:text-sm">{t("patients.subtitle")}</p>
        </div>
        <Button size="sm" onClick={openNew} className="flex-shrink-0 gap-1">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("patients.new")}</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-teal-600" />
            <span className="text-xs text-gray-500 font-medium">{t("patients.total")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-500 font-medium">{t("patients.new_this_month")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.newThisMonth ?? "—"}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-500 font-medium">{t("patients.by_source")}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {stats?.bySource?.slice(0, 4).map((s: { source: string | null; _count: number }) => s.source && (
              <Badge key={s.source} variant="secondary" className="capitalize text-xs">
                {t(`patients.sources.${s.source}`)} ({s._count})
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t("patients.search_placeholder")}
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">{t("common.all")}</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{t(`patients.sources.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{t("patients.empty_state")}</p>
          <Button className="mt-4" size="sm" onClick={openNew}>
            {t("patients.add_first")}
          </Button>
        </div>
      ) : (
        <>
          {/* MOBILE cards */}
          <div className="md:hidden space-y-2">
            {patients.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-3 hover:border-teal-200 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/patients/${p.id}`} className="font-semibold text-sm text-gray-900 hover:text-teal-600 block truncate">
                      {p.name}
                    </Link>
                    <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                      <Phone className="h-3 w-3" />{p.phone}
                    </a>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.source && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 capitalize">
                          <SourceIcon source={p.source} />{t(`patients.sources.${p.source}`)}
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />{p._count.appointments}
                      </span>
                      {p.lastVisit && <span className="text-xs text-gray-400">{formatDate(p.lastVisit)}</span>}
                    </div>
                  </div>
                  <button onClick={() => openEdit(p.id)} className="text-gray-400 hover:text-teal-600 p-1">
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP table */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("patients.name")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("patients.phone")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("common.source")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("common.date")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">RDV</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${p.id}`} className="font-medium text-gray-900 hover:text-teal-600">
                        {p.name}
                      </Link>
                      {p.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {p.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${p.phone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-teal-600">
                        <Phone className="h-3 w-3" />{p.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {p.source && (
                        <Badge variant="secondary" className="capitalize flex items-center gap-1 w-fit">
                          <SourceIcon source={p.source} />
                          {t(`patients.sources.${p.source}`)}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />{p._count.appointments}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p.id)}
                          className="p-1.5 rounded hover:bg-teal-50 text-gray-500 hover:text-teal-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {t("common.page_of", { current: String(page), total: String(totalPages) })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <PatientFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditId(undefined); }}
        editId={editId}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(undefined); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("common.delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">{t("patients.delete_confirm")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(undefined)}>{t("common.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
              disabled={deleteMut.isPending}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
