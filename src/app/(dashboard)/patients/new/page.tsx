"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewPatientPage() {
  const router = useRouter();
  const createPatient = trpc.patient.create.useMutation({
    onSuccess: (patient) => router.push(`/patients/${patient.id}`),
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "",
    address: "",
    notes: "",
    source: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPatient.mutate({
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      gender: (form.gender as "MALE" | "FEMALE") || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      source: form.source || undefined,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/patients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau patient</h1>
          <p className="text-gray-500 text-sm">مريض جديد</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations du patient</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ahmed Benali" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input id="phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0555 123 456" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="patient@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Genre</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger id="gender"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Homme — ذكر</SelectItem>
                    <SelectItem value="FEMALE">Femme — أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Alger, Algérie" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger id="source"><SelectValue placeholder="Comment a-t-il trouvé la clinique?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="referral">Référence</SelectItem>
                  <SelectItem value="walk_in">Sur place</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Allergies, antécédents médicaux..."
              />
            </div>

            {createPatient.error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md border border-red-200">
                {createPatient.error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createPatient.isPending}>
                {createPatient.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le patient
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/patients">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
