"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Building2,
  Clock,
  Calendar,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const ALGERIAN_CITIES = [
  "Alger",
  "Oran",
  "Constantine",
  "Annaba",
  "Blida",
  "Batna",
  "Djelfa",
  "Sétif",
  "Sidi Bel Abbès",
  "Biskra",
  "Tébessa",
  "Tiaret",
  "Béjaïa",
  "Tlemcen",
  "Ouargla",
  "Skikda",
  "Mostaganem",
  "Chlef",
  "El Oued",
  "Bordj Bou Arréridj",
];

const DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
];

type SubscriptionPlan = "BASIC" | "PRO" | "ENTERPRISE";

type WorkingDay = {
  open: boolean;
  start?: string;
  end?: string;
};

type FormState = {
  name: string;
  slug: string;
  logo: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  workingHours: Record<string, WorkingDay>;
  holidays: string[];
  subscriptionPlan: SubscriptionPlan;
  monthlyFee: number;
};

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Informations de base" },
  { label: "Horaires & Config." },
  { label: "Abonnement" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, idx) => {
        const num = idx + 1;
        const isCompleted = num < current;
        const isCurrent = num === current;
        return (
          <div key={num} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                  isCurrent && "bg-teal-600 text-white",
                  isCompleted && "bg-teal-100 text-teal-600",
                  !isCurrent && !isCompleted && "bg-gray-100 text-gray-400"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap hidden sm:block",
                  isCurrent && "text-teal-600",
                  isCompleted && "text-teal-500",
                  !isCurrent && !isCompleted && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Connector line */}
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 sm:w-24 mx-2 mt-[-18px] sm:mt-[-18px] transition-colors",
                  num < current ? "bg-teal-400" : "bg-gray-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function NewClinicPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    logo: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    workingHours: {
      monday: { open: true, start: "09:00", end: "18:00" },
      tuesday: { open: true, start: "09:00", end: "18:00" },
      wednesday: { open: true, start: "09:00", end: "18:00" },
      thursday: { open: true, start: "09:00", end: "18:00" },
      friday: { open: true, start: "09:00", end: "18:00" },
      saturday: { open: true, start: "09:00", end: "13:00" },
      sunday: { open: false, start: "09:00", end: "18:00" },
    },
    holidays: [
      "2026-01-01",
      "2026-05-01",
      "2026-07-05",
      "2026-11-01",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
      "2026-06-16",
      "2026-06-17",
      "2026-06-18",
      "2026-06-26",
      "2026-09-04",
    ],
    subscriptionPlan: "BASIC",
    monthlyFee: 12000,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newHoliday, setNewHoliday] = useState("");

  // Slug availability query
  const slugCheck = trpc.clinic.checkSlug.useQuery(
    { slug: form.slug },
    { enabled: form.slug.length > 2 }
  );

  // Create mutation
  const createClinic = trpc.clinic.adminCreate.useMutation();

  // ── Helpers ────────────────────────────────────────────────────────────────

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function handleNameChange(name: string) {
    const autoSlug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .slice(0, 50);
    setForm((prev) => ({ ...prev, name, slug: autoSlug }));
    if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
    if (errors.slug) setErrors((prev) => ({ ...prev, slug: "" }));
  }

  function updateWorkingHour(
    dayKey: string,
    field: "open" | "start" | "end",
    value: boolean | string
  ) {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [dayKey]: {
          ...prev.workingHours[dayKey],
          [field]: value,
        },
      },
    }));
  }

  function addHoliday() {
    if (!newHoliday) return;
    if (form.holidays.includes(newHoliday)) return;
    setForm((prev) => ({ ...prev, holidays: [...prev.holidays, newHoliday].sort() }));
    setNewHoliday("");
  }

  function removeHoliday(date: string) {
    setForm((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((d) => d !== date),
    }));
  }

  function selectPlan(plan: SubscriptionPlan) {
    const fees: Record<SubscriptionPlan, number> = {
      BASIC: 12000,
      PRO: 22000,
      ENTERPRISE: 50000,
    };
    setForm((prev) => ({
      ...prev,
      subscriptionPlan: plan,
      monthlyFee: fees[plan],
    }));
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!form.name || form.name.length < 3) e.name = "Minimum 3 caractères";
    if (!form.slug || !/^[a-z0-9-]+$/.test(form.slug))
      e.slug = "Format invalide (lettres minuscules, chiffres, tirets)";
    if (!form.phone) e.phone = "Téléphone requis";
    if (!form.city) e.city = "Ville requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    createClinic.mutate(
      { ...form },
      {
        onSuccess: (result) => {
          toast({
            title: "Clinique créée avec succès!",
            description: result.name,
            variant: "success",
          });
          router.push(`/admin/clinics/${result.id}`);
        },
        onError: (err) => {
          toast({ title: "Erreur", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-gray-700 transition-colors">
          Admin
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/admin/clinics" className="hover:text-gray-700 transition-colors">
          Cliniques
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">Nouvelle</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle Clinique</h1>
        </div>
      </div>

      {/* Card */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="pt-6">
          <StepIndicator current={step} />

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg text-gray-800">Informations de base</CardTitle>
              </CardHeader>

              {/* Logo URL */}
              <div className="space-y-1.5">
                <Label htmlFor="logo">Logo (URL)</Label>
                <div className="flex items-center gap-3">
                  {form.logo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logo}
                      alt="Logo preview"
                      className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <Input
                    id="logo"
                    placeholder="https://... (URL de l'image)"
                    value={form.logo}
                    onChange={(e) => updateField("logo", e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Clinic name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Nom de la clinique <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Ex: Clinique El Hayat"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={cn(errors.name && "border-red-400")}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  Slug (URL) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  placeholder="ex: clinique-el-hayat"
                  value={form.slug}
                  onChange={(e) => {
                    const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    updateField("slug", v);
                  }}
                  className={cn(errors.slug && "border-red-400")}
                />
                {/* Slug validation indicator */}
                {form.slug.length > 2 && (
                  <div className="flex items-center gap-2 text-xs">
                    {slugCheck.isLoading ? (
                      <span className="text-gray-400">Vérification...</span>
                    ) : slugCheck.data?.available ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-600">Disponible</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-500">Déjà utilisé</span>
                      </>
                    )}
                    <span className="text-gray-400 ml-auto">
                      clinomatic.dz/{form.slug || "…"}
                    </span>
                  </div>
                )}
                {errors.slug && <p className="text-xs text-red-500">{errors.slug}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Téléphone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+213XXXXXXXXX ou 0XXXXXXXXX"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={cn(errors.phone && "border-red-400")}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@clinique.dz"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse (optionnel)</Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="Rue, quartier..."
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="resize-none"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label>
                  Ville <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.city}
                  onValueChange={(v) => updateField("city", v)}
                >
                  <SelectTrigger className={cn(errors.city && "border-red-400")}>
                    <SelectValue placeholder="Sélectionner une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALGERIAN_CITIES.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <Button variant="outline" asChild>
                  <Link href="/admin/clinics">Annuler</Link>
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    if (validateStep1()) setStep(2);
                  }}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <div className="space-y-6">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-teal-600" />
                  Horaires de travail
                </CardTitle>
              </CardHeader>

              {/* Working hours table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {DAYS.map((day, idx) => {
                  const hours = form.workingHours[day.key];
                  return (
                    <div
                      key={day.key}
                      className={cn(
                        "flex flex-wrap sm:flex-nowrap items-center gap-3 px-4 py-3",
                        idx !== DAYS.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      {/* Day name */}
                      <div className="w-36 shrink-0">
                        <span className="text-sm font-medium text-gray-800">{day.label}</span>
                      </div>

                      {/* Switch */}
                      <Switch
                        checked={hours.open}
                        onCheckedChange={(v) => updateWorkingHour(day.key, "open", v)}
                      />

                      {/* Times or closed label */}
                      {hours.open ? (
                        <div className="flex items-center gap-2 ml-auto sm:ml-0">
                          <input
                            type="time"
                            value={hours.start ?? "09:00"}
                            onChange={(e) =>
                              updateWorkingHour(day.key, "start", e.target.value)
                            }
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="text-gray-400 text-xs">→</span>
                          <input
                            type="time"
                            value={hours.end ?? "18:00"}
                            onChange={(e) =>
                              updateWorkingHour(day.key, "end", e.target.value)
                            }
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic ml-auto sm:ml-0">
                          —
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Holidays */}
              <div className="space-y-3">
                <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Jours fériés
                </CardTitle>

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newHoliday}
                    onChange={(e) => setNewHoliday(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Button
                    variant="outline"
                    onClick={addHoliday}
                    disabled={!newHoliday}
                    className="shrink-0"
                  >
                    Ajouter
                  </Button>
                </div>

                {/* Holiday chips */}
                <div className="flex flex-wrap gap-2">
                  {form.holidays.map((date) => (
                    <div
                      key={date}
                      className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium rounded-full px-3 py-1"
                    >
                      <span>{date}</span>
                      <button
                        onClick={() => removeHoliday(date)}
                        className="hover:text-orange-900 transition-colors"
                        aria-label={`Supprimer ${date}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => setStep(3)}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <div className="space-y-6">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-lg text-gray-800">Abonnement</CardTitle>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* BASIC */}
                <button
                  type="button"
                  onClick={() => selectPlan("BASIC")}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 transition-all focus:outline-none",
                    form.subscriptionPlan === "BASIC"
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-blue-200"
                  )}
                >
                  <div className="mb-3">
                    <span className="text-base font-bold text-blue-600">BASIC</span>
                    <p className="text-lg font-bold text-gray-900 mt-1">12,000 DA/mois</p>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {[
                      "Jusqu'à 300 RDV/mois",
                      "1 médecin",
                      "Gestion patients",
                      "Confirmation par agents",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-gray-700">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                    {["Automatisation WhatsApp", "Intégrations réseaux sociaux"].map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-gray-400">
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>

                {/* PRO */}
                <button
                  type="button"
                  onClick={() => selectPlan("PRO")}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 transition-all focus:outline-none relative",
                    form.subscriptionPlan === "PRO"
                      ? "border-teal-500 ring-2 ring-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-teal-300"
                  )}
                >
                  {/* Badge */}
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                    POPULAIRE
                  </span>
                  <div className="mb-3">
                    <span className="text-base font-bold text-teal-600">PRO</span>
                    <p className="text-lg font-bold text-gray-900 mt-1">22,000 DA/mois</p>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {[
                      "Jusqu'à 300 RDV/mois",
                      "1 médecin",
                      "Gestion patients",
                      "Confirmation par agents",
                      "Automatisation WhatsApp",
                      "Rappels automatiques",
                      "Intégrations réseaux sociaux",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-gray-700">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>

                {/* ENTERPRISE */}
                <button
                  type="button"
                  onClick={() => selectPlan("ENTERPRISE")}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 transition-all focus:outline-none",
                    form.subscriptionPlan === "ENTERPRISE"
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-200 hover:border-yellow-300"
                  )}
                >
                  <div className="mb-3">
                    <span className="text-base font-bold text-yellow-600">ENTERPRISE</span>
                    <p className="text-lg font-bold text-gray-900 mt-1">Prix personnalisé</p>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {[
                      "RDV illimités",
                      "Médecins illimités",
                      "Multi-localisation",
                      "Toutes fonctionnalités PRO",
                      "Support prioritaire",
                      "Formation personnalisée",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-gray-700">
                        <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              </div>

              {/* Custom fee input for ENTERPRISE */}
              {form.subscriptionPlan === "ENTERPRISE" && (
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyFee">Frais mensuels personnalisés (DA)</Label>
                  <Input
                    id="monthlyFee"
                    type="number"
                    min={0}
                    value={form.monthlyFee}
                    onChange={(e) =>
                      updateField("monthlyFee", Number(e.target.value))
                    }
                    className="max-w-xs"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-1">
                <p className="font-medium text-gray-700">Récapitulatif</p>
                <p className="text-gray-500">
                  Clinique :{" "}
                  <span className="font-semibold text-gray-800">{form.name || "—"}</span>
                </p>
                <p className="text-gray-500">
                  Plan :{" "}
                  <span className="font-semibold text-gray-800">{form.subscriptionPlan}</span>
                </p>
                <p className="text-gray-500">
                  Frais mensuels :{" "}
                  <span className="font-semibold text-gray-800">
                    {form.monthlyFee.toLocaleString("fr-DZ")} DA
                  </span>
                </p>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleSubmit}
                  disabled={createClinic.isPending}
                >
                  {createClinic.isPending ? "Création..." : "Créer la clinique"}
                  {!createClinic.isPending && <Check className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
