"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, Plus, Trash2, Loader2, Stethoscope } from "lucide-react";
import Link from "next/link";

export default function DoctorsSettingsPage() {
  const utils = trpc.useUtils();
  const { data: doctors, isLoading } = trpc.doctor.list.useQuery();
  const createDoctor = trpc.doctor.create.useMutation({
    onSuccess: () => { utils.doctor.list.invalidate(); setOpen(false); },
  });
  const deleteDoctor = trpc.doctor.delete.useMutation({
    onSuccess: () => utils.doctor.list.invalidate(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", specialty: "", phone: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createDoctor.mutate({
      name: form.name,
      specialty: form.specialty || undefined,
      phone: form.phone || undefined,
    });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Médecins</h1>
            <p className="text-gray-500 text-sm">{doctors?.length} médecins configurés</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Ajouter un médecin</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau médecin</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nom complet *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Mohamed Benali" />
              </div>
              <div className="space-y-2">
                <Label>Spécialité</Label>
                <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Médecine générale" />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0555 000 000" />
              </div>
              <Button type="submit" className="w-full" disabled={createDoctor.isPending}>
                {createDoctor.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le médecin
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {doctors?.map((doctor) => (
          <Card key={doctor.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-5 w-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Dr. {doctor.name}</p>
                {doctor.specialty && <p className="text-sm text-gray-500">{doctor.specialty}</p>}
                {doctor.phone && <p className="text-xs text-gray-400">{doctor.phone}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:bg-red-50"
                onClick={() => { if (confirm("Désactiver ce médecin?")) deleteDoctor.mutate({ id: doctor.id }); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {doctors?.length === 0 && (
          <div className="text-center py-12 text-gray-400">Aucun médecin configuré</div>
        )}
      </div>
    </div>
  );
}
