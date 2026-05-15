"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/ui/toast";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Clock, Calendar,
  Plus, Trash2, Pencil, MoreVertical, Users, Stethoscope,
  Settings, Eye, ShieldAlert, CheckCircle,
} from "lucide-react";

const DAYS = [
  { key: "monday",    fr: "Lundi",     ar: "الاثنين" },
  { key: "tuesday",   fr: "Mardi",     ar: "الثلاثاء" },
  { key: "wednesday", fr: "Mercredi",  ar: "الأربعاء" },
  { key: "thursday",  fr: "Jeudi",     ar: "الخميس" },
  { key: "friday",    fr: "Vendredi",  ar: "الجمعة" },
  { key: "saturday",  fr: "Samedi",    ar: "السبت" },
  { key: "sunday",    fr: "Dimanche",  ar: "الأحد" },
];

const SPECIALTIES = [
  "Médecin généraliste", "Dentiste", "Pédiatre", "Gynécologue",
  "Dermatologue", "Cardiologue", "ORL", "Ophtalmologue", "Psychiatre", "Autre",
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

const PLAN_COLORS: Record<string, string> = {
  BASIC: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-yellow-100 text-yellow-700",
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  CLINIC_OWNER: "bg-teal-100 text-teal-700",
  CLINIC_STAFF: "bg-gray-100 text-gray-700",
  DOCTOR: "bg-blue-100 text-blue-700",
  CONFIRMATION_AGENT: "bg-orange-100 text-orange-700",
};

const ALGERIAN_CITIES = [
  "Alger","Oran","Constantine","Annaba","Blida","Batna","Djelfa","Sétif",
  "Sidi Bel Abbès","Biskra","Tébessa","Tiaret","Béjaïa","Tlemcen","Ouargla",
  "Skikda","Mostaganem","Chlef","El Oued","Bordj Bou Arréridj",
];

// ─────────────────────────────────────────────────────────────────────────────

export default function ClinicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const { data: clinic, isLoading } = trpc.clinic.adminGetById.useQuery({ id });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const toggleActive = trpc.clinic.adminToggleActive.useMutation({
    onSuccess: () => {
      toast({ title: "Statut mis à jour", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
    },
  });

  const deleteClinic = trpc.clinic.adminDelete.useMutation({
    onSuccess: () => {
      toast({ title: "Clinique supprimée", variant: "success" });
      router.push("/admin/clinics");
    },
  });

  const addDoctor = trpc.doctor.adminCreate.useMutation({
    onSuccess: () => {
      toast({ title: "Médecin ajouté", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
      setAddDoctorOpen(false);
      setDoctorForm({ name: "", specialty: "", phone: "" });
    },
  });

  const updateDoctor = trpc.doctor.adminUpdate.useMutation({
    onSuccess: () => {
      toast({ title: "Médecin modifié", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
      setEditDoctorOpen(false);
    },
  });

  const deleteDoctor = trpc.doctor.adminDelete.useMutation({
    onSuccess: () => {
      toast({ title: "Médecin supprimé", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
    },
  });

  const addService = trpc.service.adminCreate.useMutation({
    onSuccess: () => {
      toast({ title: "Service ajouté", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
      setAddServiceOpen(false);
      setServiceForm({ name: "", nameAr: "", price: 0, duration: 30, description: "", color: "#3B82F6" });
    },
  });

  const updateService = trpc.service.adminUpdate.useMutation({
    onSuccess: () => {
      toast({ title: "Service modifié", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
      setEditServiceOpen(false);
    },
  });

  const deleteService = trpc.service.adminDelete.useMutation({
    onSuccess: () => {
      toast({ title: "Service supprimé", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
    },
  });

  const updateClinic = trpc.clinic.adminUpdate.useMutation({
    onSuccess: () => {
      toast({ title: "Clinique mise à jour", variant: "success" });
      utils.clinic.adminGetById.invalidate({ id });
    },
  });

  // ── Doctor state ───────────────────────────────────────────────────────────
  const [addDoctorOpen, setAddDoctorOpen] = useState(false);
  const [editDoctorOpen, setEditDoctorOpen] = useState(false);
  const [deleteDoctorId, setDeleteDoctorId] = useState<string | null>(null);
  const [doctorForm, setDoctorForm] = useState({ name: "", specialty: "", phone: "" });
  const [editDoctorData, setEditDoctorData] = useState({ id: "", name: "", specialty: "", phone: "" });

  // ── Service state ──────────────────────────────────────────────────────────
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [editServiceOpen, setEditServiceOpen] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: "", nameAr: "", price: 0, duration: 30, description: "", color: "#3B82F6" });
  const [editServiceData, setEditServiceData] = useState({ id: "", name: "", nameAr: "", price: 0, duration: 30, description: "", color: "#3B82F6" });

  // ── Settings state ─────────────────────────────────────────────────────────
  const [deleteClinicOpen, setDeleteClinicOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: "", phone: "", email: "", address: "", city: "" });

  useEffect(() => {
    if (clinic) {
      setSettingsForm({
        name: clinic.name,
        phone: clinic.phone,
        email: clinic.email ?? "",
        address: clinic.address ?? "",
        city: clinic.city ?? "",
      });
    }
  }, [clinic]);

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading) return <PageLoader />;
  if (!clinic) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-medium">Clinique introuvable</p>
      <Button asChild variant="outline" className="mt-4"><Link href="/admin/clinics">Retour</Link></Button>
    </div>
  );

  const workingHours = (clinic.workingHours ?? {}) as Record<string, { open: boolean; start?: string; end?: string }>;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-teal-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/clinics" className="hover:text-teal-600">Cliniques</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{clinic.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {clinic.logo ? (
            <img src={clinic.logo} alt={clinic.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700 text-2xl font-bold flex-shrink-0">
              {clinic.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{clinic.name}</h1>
              <Badge className={clinic.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                {clinic.isActive ? "Actif" : "Inactif"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">{clinic.city} · {clinic.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/clinics/${id}/edit`}><Edit className="h-4 w-4 mr-1" />Modifier</Link>
          </Button>
          <Button
            variant="outline" size="sm"
            className={clinic.isActive ? "border-red-300 text-red-600 hover:bg-red-50" : "border-green-300 text-green-600 hover:bg-green-50"}
            onClick={() => toggleActive.mutate({ id })}
            disabled={toggleActive.isPending}
          >
            {clinic.isActive ? "Désactiver" : "Activer"}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Médecins", value: clinic._count.doctors, icon: Stethoscope, color: "text-blue-600" },
          { label: "Services", value: clinic._count.services, icon: Settings, color: "text-purple-600" },
          { label: "Patients", value: clinic._count.patients, icon: Users, color: "text-teal-600" },
          { label: "RDV ce mois", value: clinic.monthAppointments, icon: Calendar, color: "text-orange-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn("h-8 w-8 flex-shrink-0", s.color)} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-1.5"><Eye className="h-4 w-4" /><span>Aperçu</span></TabsTrigger>
            <TabsTrigger value="doctors" className="gap-1.5">
              <Stethoscope className="h-4 w-4" />
              <span>Médecins</span>
              <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{clinic._count.doctors}</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-1.5">
              <Settings className="h-4 w-4" />
              <span>Services</span>
              <span className="ml-1 bg-purple-100 text-purple-700 text-xs px-1.5 rounded-full">{clinic._count.services}</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>Équipe</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-4 w-4" />
              <span>Paramètres</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB: OVERVIEW ─────────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Info card */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Informations</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${clinic.phone}`} className="text-teal-600 hover:underline">{clinic.phone}</a>
                  </div>
                  {clinic.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${clinic.email}`} className="text-teal-600 hover:underline truncate">{clinic.email}</a>
                    </div>
                  )}
                  {clinic.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{clinic.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Plan:</span>
                    <Badge className={PLAN_COLORS[clinic.subscriptionPlan] ?? ""}>{clinic.subscriptionPlan}</Badge>
                    <span className="font-semibold">{formatCurrency(clinic.monthlyFee)}/mois</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Créée le {formatDate(clinic.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Horaires d'ouverture</CardTitle></CardHeader>
                <CardContent className="space-y-1.5">
                  {DAYS.map((d) => {
                    const h = workingHours[d.key];
                    return (
                      <div key={d.key} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-20">{d.fr}</span>
                          <span className="text-gray-400 text-xs" dir="rtl">{d.ar}</span>
                        </div>
                        {h?.open ? (
                          <span className="text-gray-700">{h.start} – {h.end}</span>
                        ) : (
                          <span className="text-gray-400">Fermé / مغلق</span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Recent appointments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Rendez-vous récents</CardTitle>
              </CardHeader>
              <CardContent>
                {clinic.recentAppointments.length === 0 ? (
                  <p className="text-center text-gray-400 py-8 text-sm">Aucun rendez-vous récent</p>
                ) : (
                  <div className="space-y-2">
                    {clinic.recentAppointments.map((apt) => (
                      <div key={apt.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="text-center flex-shrink-0 w-12">
                          <p className="text-xs font-bold text-teal-600">
                            {new Date(apt.date).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(apt.date).toLocaleDateString("fr", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{apt.patient.name}</p>
                          <p className="text-xs text-gray-500 truncate">{apt.service.name}</p>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB: DOCTORS ──────────────────────────────────────────────────── */}
        <TabsContent value="doctors">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Médecins / الأطباء</CardTitle>
              <Button size="sm" onClick={() => setAddDoctorOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {clinic.doctors.length === 0 ? (
                <div className="text-center py-12">
                  <Stethoscope className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun médecin enregistré</p>
                  <Button size="sm" className="mt-3" onClick={() => setAddDoctorOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />Ajouter un médecin
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Nom", "Spécialité", "Téléphone", "RDV", "Statut", "Actions"].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clinic.doctors.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-medium text-gray-900">{doc.name}</td>
                          <td className="px-3 py-3 text-gray-600">{doc.specialty ?? "—"}</td>
                          <td className="px-3 py-3 text-gray-600">
                            {doc.phone ? <a href={`tel:${doc.phone}`} className="hover:text-teal-600">{doc.phone}</a> : "—"}
                          </td>
                          <td className="px-3 py-3 text-gray-600">{doc._count.appointments}</td>
                          <td className="px-3 py-3">
                            <Badge className={doc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                              {doc.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                onClick={() => { setEditDoctorData({ id: doc.id, name: doc.name, specialty: doc.specialty ?? "", phone: doc.phone ?? "" }); setEditDoctorOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteDoctorId(doc.id)} disabled={deleteDoctor.isPending}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: SERVICES ─────────────────────────────────────────────────── */}
        <TabsContent value="services">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Services / الخدمات</h2>
            <Button size="sm" onClick={() => setAddServiceOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Ajouter
            </Button>
          </div>
          {clinic.services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun service enregistré</p>
                <Button size="sm" className="mt-3" onClick={() => setAddServiceOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />Ajouter un service
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinic.services.map((svc) => (
                <Card key={svc.id} className="border-l-4" style={{ borderLeftColor: svc.color ?? "#3B82F6" }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{svc.name}</p>
                        {svc.nameAr && <p className="text-xs text-gray-400" dir="rtl">{svc.nameAr}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => { setEditServiceData({ id: svc.id, name: svc.name, nameAr: svc.nameAr ?? "", price: svc.price, duration: svc.duration, description: svc.description ?? "", color: svc.color ?? "#3B82F6" }); setEditServiceOpen(true); }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteServiceId(svc.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{svc.price.toLocaleString()} <span className="text-sm font-normal text-gray-500">DA</span></p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <Clock className="h-3.5 w-3.5" />{svc.duration} min
                    </div>
                    {svc.description && <p className="text-xs text-gray-500 mt-2 line-clamp-2">{svc.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: STAFF ────────────────────────────────────────────────────── */}
        <TabsContent value="staff">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Équipe / الفريق ({clinic.users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {clinic.users.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucun membre dans l'équipe</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {["Nom", "Rôle", "Téléphone", "Email", "Dernier accès", "Statut"].map((h) => (
                          <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {clinic.users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-medium text-gray-900">{u.name}</td>
                          <td className="px-3 py-3">
                            <Badge className={ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-600"}>{u.role}</Badge>
                          </td>
                          <td className="px-3 py-3 text-gray-600">{u.phone}</td>
                          <td className="px-3 py-3 text-gray-600 max-w-[160px] truncate">{u.email ?? "—"}</td>
                          <td className="px-3 py-3 text-gray-500">
                            {u.lastActive ? formatDate(u.lastActive) : "Jamais"}
                          </td>
                          <td className="px-3 py-3">
                            <Badge className={u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                              {u.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB: SETTINGS ─────────────────────────────────────────────────── */}
        <TabsContent value="settings">
          <div className="max-w-xl space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Modifier les informations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nom de la clinique</Label>
                  <Input value={settingsForm.name} onChange={(e) => setSettingsForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={settingsForm.phone} onChange={(e) => setSettingsForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={settingsForm.email} onChange={(e) => setSettingsForm((p) => ({ ...p, email: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Textarea value={settingsForm.address} onChange={(e) => setSettingsForm((p) => ({ ...p, address: e.target.value }))} className="mt-1" rows={2} />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Select value={settingsForm.city} onValueChange={(v) => setSettingsForm((p) => ({ ...p, city: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
                    <SelectContent>{ALGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => updateClinic.mutate({ id, ...settingsForm })}
                  disabled={updateClinic.isPending}
                >
                  {updateClinic.isPending ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </Button>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />Zone dangereuse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {clinic.isActive ? "Désactiver la clinique" : "Réactiver la clinique"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {clinic.isActive ? "Les utilisateurs ne pourront plus accéder" : "Restaure l'accès à la clinique"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => toggleActive.mutate({ id })}
                    disabled={toggleActive.isPending}
                  >
                    {clinic.isActive ? "Désactiver" : "Activer"}
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Supprimer définitivement</p>
                    <p className="text-xs text-gray-500">Action irréversible — toutes les données seront perdues</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteClinicOpen(true)}>
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── DIALOGS ─────────────────────────────────────────────────────────── */}

      {/* Add Doctor */}
      <Dialog open={addDoctorOpen} onOpenChange={setAddDoctorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un médecin / إضافة طبيب</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nom complet *</Label><Input className="mt-1" value={doctorForm.name} onChange={(e) => setDoctorForm((p) => ({ ...p, name: e.target.value }))} placeholder="Dr. Nom Prénom" /></div>
            <div>
              <Label>Spécialité</Label>
              <Select value={doctorForm.specialty} onValueChange={(v) => setDoctorForm((p) => ({ ...p, specialty: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Téléphone</Label><Input className="mt-1" value={doctorForm.phone} onChange={(e) => setDoctorForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+213..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>Annuler</Button>
            <Button onClick={() => addDoctor.mutate({ clinicId: id, ...doctorForm })} disabled={!doctorForm.name || addDoctor.isPending}>
              {addDoctor.isPending ? "Ajout..." : "Ajouter le médecin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor */}
      <Dialog open={editDoctorOpen} onOpenChange={setEditDoctorOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le médecin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nom complet</Label><Input className="mt-1" value={editDoctorData.name} onChange={(e) => setEditDoctorData((p) => ({ ...p, name: e.target.value }))} /></div>
            <div>
              <Label>Spécialité</Label>
              <Select value={editDoctorData.specialty} onValueChange={(v) => setEditDoctorData((p) => ({ ...p, specialty: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Téléphone</Label><Input className="mt-1" value={editDoctorData.phone} onChange={(e) => setEditDoctorData((p) => ({ ...p, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoctorOpen(false)}>Annuler</Button>
            <Button onClick={() => updateDoctor.mutate({ id: editDoctorData.id, name: editDoctorData.name, specialty: editDoctorData.specialty, phone: editDoctorData.phone })} disabled={updateDoctor.isPending}>
              {updateDoctor.isPending ? "Modification..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Doctor confirm */}
      <Dialog open={!!deleteDoctorId} onOpenChange={() => setDeleteDoctorId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer le médecin?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Cette action est irréversible. هل أنت متأكد؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoctorId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { if (deleteDoctorId) deleteDoctor.mutate({ id: deleteDoctorId }); setDeleteDoctorId(null); }} disabled={deleteDoctor.isPending}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Service */}
      <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un service / إضافة خدمة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nom (Français) *</Label><Input className="mt-1" value={serviceForm.name} onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Nom (Arabe)</Label><Input className="mt-1" dir="rtl" value={serviceForm.nameAr} onChange={(e) => setServiceForm((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix (DA)</Label><Input className="mt-1" type="number" min={0} value={serviceForm.price} onChange={(e) => setServiceForm((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
              <div>
                <Label>Durée</Label>
                <Select value={String(serviceForm.duration)} onValueChange={(v) => setServiceForm((p) => ({ ...p, duration: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={serviceForm.description} onChange={(e) => setServiceForm((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex items-center gap-3"><Label>Couleur</Label><input type="color" value={serviceForm.color} onChange={(e) => setServiceForm((p) => ({ ...p, color: e.target.value }))} className="h-8 w-16 rounded cursor-pointer border border-gray-300" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddServiceOpen(false)}>Annuler</Button>
            <Button onClick={() => addService.mutate({ clinicId: id, ...serviceForm })} disabled={!serviceForm.name || addService.isPending}>
              {addService.isPending ? "Ajout..." : "Ajouter le service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Service */}
      <Dialog open={editServiceOpen} onOpenChange={setEditServiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le service</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nom (Français)</Label><Input className="mt-1" value={editServiceData.name} onChange={(e) => setEditServiceData((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Nom (Arabe)</Label><Input className="mt-1" dir="rtl" value={editServiceData.nameAr} onChange={(e) => setEditServiceData((p) => ({ ...p, nameAr: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prix (DA)</Label><Input className="mt-1" type="number" min={0} value={editServiceData.price} onChange={(e) => setEditServiceData((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
              <div>
                <Label>Durée</Label>
                <Select value={String(editServiceData.duration)} onValueChange={(v) => setEditServiceData((p) => ({ ...p, duration: Number(v) }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={editServiceData.description} onChange={(e) => setEditServiceData((p) => ({ ...p, description: e.target.value }))} /></div>
            <div className="flex items-center gap-3"><Label>Couleur</Label><input type="color" value={editServiceData.color} onChange={(e) => setEditServiceData((p) => ({ ...p, color: e.target.value }))} className="h-8 w-16 rounded cursor-pointer border border-gray-300" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditServiceOpen(false)}>Annuler</Button>
            <Button onClick={() => updateService.mutate({ id: editServiceData.id, name: editServiceData.name, nameAr: editServiceData.nameAr, price: editServiceData.price, duration: editServiceData.duration, description: editServiceData.description, color: editServiceData.color })} disabled={updateService.isPending}>
              {updateService.isPending ? "Modification..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service confirm */}
      <Dialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer le service?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Cette action est irréversible. هل أنت متأكد؟</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServiceId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { if (deleteServiceId) deleteService.mutate({ id: deleteServiceId }); setDeleteServiceId(null); }} disabled={deleteService.isPending}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Clinic confirm */}
      <Dialog open={deleteClinicOpen} onOpenChange={setDeleteClinicOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-700">Supprimer la clinique?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer <strong>{clinic.name}</strong>? Cette action est irréversible — tous les patients, rendez-vous et données seront perdus.
            <br /><span className="text-xs text-gray-400" dir="rtl">هل أنت متأكد؟ هذا الإجراء لا رجعة فيه.</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClinicOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteClinic.mutate({ id })} disabled={deleteClinic.isPending}>
              {deleteClinic.isPending ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
