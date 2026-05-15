"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function ServicesSettingsPage() {
  const utils = trpc.useUtils();
  const { data: services, isLoading } = trpc.service.list.useQuery();
  const createService = trpc.service.create.useMutation({ onSuccess: () => { utils.service.list.invalidate(); setOpen(false); } });
  const deleteService = trpc.service.delete.useMutation({ onSuccess: () => utils.service.list.invalidate() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", duration: "30", color: "#0d9488" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createService.mutate({
      name: form.name,
      price: parseInt(form.price),
      duration: parseInt(form.duration),
      color: form.color,
    });
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-500 text-sm">{services?.length} services configurés</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Ajouter un service</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau service</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nom du service *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Consultation" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix (DA) *</Label>
                  <Input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2000" />
                </div>
                <div className="space-y-2">
                  <Label>Durée (min) *</Label>
                  <Input required type="number" min="5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Couleur (calendrier)</Label>
                <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-24" />
              </div>
              <Button type="submit" className="w-full" disabled={createService.isPending}>
                {createService.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le service
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {services?.map((service) => (
          <Card key={service.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: service.color || "#0d9488" }} />
              <div className="flex-1">
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-gray-500">{formatCurrency(service.price)} — {service.duration} min</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50"
                  onClick={() => { if (confirm("Supprimer ce service?")) deleteService.mutate({ id: service.id }); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {services?.length === 0 && (
          <div className="text-center py-12 text-gray-400">Aucun service configuré</div>
        )}
      </div>
    </div>
  );
}
