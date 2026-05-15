"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import Link from "next/link";

function NewAppointmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  const { data: services } = trpc.service.list.useQuery();
  const { data: doctors } = trpc.doctor.list.useQuery();
  const { data: patientsData } = trpc.patient.list.useQuery({ limit: 100, page: 1 });
  const patients = patientsData?.patients ?? [];

  const createAppointment = trpc.appointment.create.useMutation({
    onSuccess: (apt) => router.push(`/appointments/${apt.id}`),
  });

  const [form, setForm] = useState({
    patientId: preselectedPatientId || "",
    serviceId: "",
    doctorId: "",
    date: "",
    time: "",
    source: "manual",
    notes: "",
  });

  const [patientSearch, setPatientSearch] = useState("");
  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const selectedService = services?.find((s) => s.id === form.serviceId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) return;
    const dateTime = new Date(`${form.date}T${form.time}`);
    createAppointment.mutate({
      patientId: form.patientId,
      serviceId: form.serviceId,
      doctorId: form.doctorId || undefined,
      date: dateTime.toISOString(),
      duration: selectedService?.duration || 30,
      source: form.source,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/appointments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau rendez-vous</h1>
          <p className="text-gray-500 text-sm">Planifier un nouveau rendez-vous</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Réserver un rendez-vous</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Patient selection */}
            <div className="space-y-2">
              <Label>Patient *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Chercher un patient..."
                  className="pl-9"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
              <Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPatients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Patient introuvable?{" "}
                <Link href="/patients/new" className="text-teal-600 hover:underline">Créer un nouveau patient</Link>
              </p>
            </div>

            {/* Service */}
            <div className="space-y-2">
              <Label>Service *</Label>
              <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v })} required>
                <SelectTrigger><SelectValue placeholder="Sélectionner un service" /></SelectTrigger>
                <SelectContent>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.price.toLocaleString()} DA ({s.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor */}
            {doctors && doctors.length > 0 && (
              <div className="space-y-2">
                <Label>Médecin</Label>
                <Select value={form.doctorId} onValueChange={(v) => setForm({ ...form, doctorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un médecin (optionnel)" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        Dr. {d.name} {d.specialty && `— ${d.specialty}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Heure *</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label>Source de la réservation</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manuel</SelectItem>
                  <SelectItem value="phone">Téléphone</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="walk_in">Sur place</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            {selectedService && (
              <div className="bg-teal-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-teal-800">Récapitulatif:</p>
                <p className="text-teal-700">{selectedService.name} — {selectedService.price.toLocaleString()} DA</p>
                <p className="text-teal-600">Durée: {selectedService.duration} minutes</p>
              </div>
            )}

            {createAppointment.error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md border border-red-200">
                {createAppointment.error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createAppointment.isPending || !form.patientId || !form.serviceId}>
                {createAppointment.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le rendez-vous
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/appointments">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
