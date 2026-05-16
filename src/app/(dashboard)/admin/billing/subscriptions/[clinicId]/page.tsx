"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, CheckCircle, XCircle, Printer, Send, AlertTriangle } from "lucide-react";

function formatDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" });
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Virement bancaire",
  ccp: "CCP",
  baridimob: "BaridiMob",
  cash: "Espèces",
  card: "Carte bancaire",
};

const PLAN_FEATURES: Record<string, { label: string; yes: boolean }[]> = {
  BASIC: [
    { label: "300 RDV/mois", yes: true },
    { label: "1 médecin", yes: true },
    { label: "Gestion patients", yes: true },
    { label: "Système de confirmation", yes: true },
    { label: "Automatisation WhatsApp", yes: false },
    { label: "Intégrations sociales", yes: false },
  ],
  PRO: [
    { label: "800 RDV/mois", yes: true },
    { label: "5 médecins", yes: true },
    { label: "Gestion patients", yes: true },
    { label: "Système de confirmation", yes: true },
    { label: "Automatisation WhatsApp", yes: true },
    { label: "Intégrations sociales", yes: true },
  ],
  ENTERPRISE: [
    { label: "RDV illimités", yes: true },
    { label: "Médecins illimités", yes: true },
    { label: "Gestion patients", yes: true },
    { label: "Système de confirmation", yes: true },
    { label: "Automatisation WhatsApp", yes: true },
    { label: "Intégrations sociales", yes: true },
  ],
};

function StatusBadge({ clinic }: { clinic: { isActive: boolean; suspendedAt?: Date | string | null; cancelledAt?: Date | string | null } }) {
  if (clinic.cancelledAt) return <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">Annulé</span>;
  if (clinic.suspendedAt) return <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-700">Suspendu</span>;
  if (clinic.isActive) return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Actif</span>;
  return <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700">Inactif</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  const cls =
    plan === "ENTERPRISE"
      ? "bg-yellow-100 text-yellow-800"
      : plan === "PRO"
      ? "bg-purple-100 text-purple-800"
      : "bg-blue-100 text-blue-800";
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${cls}`}>{plan}</span>;
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    UNPAID: "bg-orange-100 text-orange-700",
    PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };
  return <span className={`px-2 py-1 rounded text-xs ${map[status] ?? "bg-gray-100"}`}>{status}</span>;
}

function Skeleton() {
  return (
    <div className="space-y-4 p-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

export default function SubscriptionDetailPage(props: { params: Promise<{ clinicId: string }> }) {
  const params = use(props.params);
  const clinicId = params.clinicId;
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.billing.getSubscriptionDetail.useQuery({ clinicId });

  const [showChangePlan, setShowChangePlan] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const [paymentForm, setPaymentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), method: "bank_transfer", reference: "", payerName: "", invoiceId: "", notes: "" });
  const [invoiceForm, setInvoiceForm] = useState({ period: "", amount: "", discountAmount: "", dueDate: "", notes: "", includeOverage: false });
  const [planForm, setPlanForm] = useState({ newPlan: "", newFee: "", effectiveDate: "next_cycle", reason: "" });
  const [cancelReason, setCancelReason] = useState("");

  const invalidate = () => utils.billing.getSubscriptionDetail.invalidate({ clinicId });

  const recordPayment = trpc.billing.recordPayment.useMutation({
    onSuccess: () => { toast({ title: "Paiement enregistré" }); setShowRecordPayment(false); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const generateInvoice = trpc.billing.generateInvoice.useMutation({
    onSuccess: () => { toast({ title: "Facture générée" }); setShowGenerateInvoice(false); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const changePlan = trpc.billing.changePlan.useMutation({
    onSuccess: () => { toast({ title: "Plan modifié" }); setShowChangePlan(false); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const suspendClinic = trpc.billing.suspendClinic.useMutation({
    onSuccess: () => { toast({ title: "Clinique suspendue" }); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const reactivateClinic = trpc.billing.reactivateClinic.useMutation({
    onSuccess: () => { toast({ title: "Clinique réactivée" }); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const cancelSubscription = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => { toast({ title: "Abonnement annulé" }); setShowCancelConfirm(false); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const addNote = trpc.billing.addNote.useMutation({
    onSuccess: () => { toast({ title: "Note ajoutée" }); setNoteContent(""); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const updatePaymentMethod = trpc.billing.updatePaymentMethod.useMutation({
    onSuccess: () => { toast({ title: "Méthode de paiement mise à jour" }); invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const sendReminder = trpc.billing.sendReminder.useMutation({
    onSuccess: () => toast({ title: "Rappel envoyé" }),
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  if (isLoading) return <Skeleton />;
  if (!data) return <div className="p-6 text-red-600">Clinique introuvable.</div>;

  const { clinic, usage, invoices, payments, notes, planChanges, summary } = data;
  const plan = clinic.subscriptionPlan as string;
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.BASIC;
  const unpaidInvoices = invoices.filter((inv) => inv.status === "UNPAID" || inv.status === "OVERDUE" || inv.status === "PARTIALLY_PAID");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/admin/billing">
          <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /> Retour</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {clinic.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{clinic.name}</h1>
              <PlanBadge plan={plan} />
              <StatusBadge clinic={clinic} />
            </div>
            <p className="text-gray-500 text-sm">{formatDA(clinic.monthlyFee)}/mois</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!clinic.suspendedAt && !clinic.cancelledAt && (
            <Button variant="outline" size="sm" onClick={() => suspendClinic.mutate({ clinicId })} disabled={suspendClinic.isPending}>
              Suspendre
            </Button>
          )}
          {clinic.suspendedAt && !clinic.cancelledAt && (
            <Button variant="outline" size="sm" onClick={() => reactivateClinic.mutate({ clinicId })} disabled={reactivateClinic.isPending}>
              Réactiver
            </Button>
          )}
          {!clinic.cancelledAt && (
            <Button variant="outline" size="sm" className="text-red-600 border-red-300" onClick={() => setShowCancelConfirm(true)}>
              Annuler l&apos;abonnement
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="plan-changes">Changements de plan</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Plan actuel</CardTitle>
                  <Button size="sm" onClick={() => setShowChangePlan(true)}>Changer de plan</Button>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold mb-1">{plan} — {formatDA(clinic.monthlyFee)}/mois</p>
                  <ul className="space-y-1 mt-3">
                    {features.map((f) => (
                      <li key={f.label} className="flex items-center gap-2 text-sm">
                        {f.yes ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-gray-300" />}
                        <span className={f.yes ? "" : "text-gray-400"}>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Facturation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Méthode de paiement</label>
                    <Select value={clinic.paymentMethod ?? ""} onValueChange={(v) => updatePaymentMethod.mutate({ clinicId, paymentMethod: v as "bank_transfer" | "ccp" | "baridimob" | "cash" | "card" })}>
                      <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Prochaine facturation</span><span>{clinic.nextBillingDate ? formatDate(clinic.nextBillingDate) : "Non défini"}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Abonné depuis</span><span>{formatDate(clinic.createdAt)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Mois d&apos;abonnement</span><span>{summary.monthsSubscribed}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Utilisation ce mois</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Rendez-vous</span>
                      <span>{usage.appointments} / {usage.appointmentLimit}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${usage.appointmentPct > 85 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${Math.min(usage.appointmentPct, 100)}%` }} />
                    </div>
                    {usage.appointments > usage.appointmentLimit && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Dépassement: {usage.appointments - usage.appointmentLimit} RDV en plus
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Médecins</span>
                      <span>{usage.doctors} / {usage.doctorLimit}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((usage.doctors / Math.max(usage.doctorLimit, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Solde</CardTitle>
                  <Button size="sm" onClick={() => { setPaymentForm((p) => ({ ...p, amount: clinic.balance < 0 ? String(Math.abs(clinic.balance)) : "" })); setShowRecordPayment(true); }}>
                    Enregistrer un paiement
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Solde actuel</span>
                    <span className={`font-semibold ${clinic.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatDA(clinic.balance)}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Total payé</span><span>{formatDA(summary.totalPaid)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Paiements tardifs</span><span>{summary.latePayments}</span></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Payments */}
        <TabsContent value="payments">
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowRecordPayment(true)}>Enregistrer un paiement</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Montant</th>
                  <th className="py-2 pr-4">Méthode</th>
                  <th className="py-2 pr-4">Référence</th>
                  <th className="py-2 pr-4">Facture</th>
                  <th className="py-2">Enregistré par</th>
                </tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatDate(p.paymentDate)}</td>
                      <td className="py-2 pr-4 font-medium">{formatDA(p.amount)}</td>
                      <td className="py-2 pr-4">{METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}</td>
                      <td className="py-2 pr-4 text-gray-500">{p.transactionReference ?? "—"}</td>
                      <td className="py-2 pr-4">{p.invoiceId ? <Link href={`/admin/billing/invoices/${p.invoiceId}/print`} className="text-blue-600 underline" target="_blank">Voir</Link> : "—"}</td>
                      <td className="py-2">{p.recorder?.name ?? "—"}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">Aucun paiement</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Invoices */}
        <TabsContent value="invoices">
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setInvoiceForm((f) => ({ ...f, amount: String(clinic.monthlyFee) })); setShowGenerateInvoice(true); }}>
                Générer une facture
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">N° Facture</th>
                  <th className="py-2 pr-4">Période</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Échéance</th>
                  <th className="py-2 pr-4">Montant</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="py-2 pr-4">{inv.period ?? "—"}</td>
                      <td className="py-2 pr-4">{formatDate(inv.date)}</td>
                      <td className="py-2 pr-4">{inv.dueDate ? formatDate(inv.dueDate) : "—"}</td>
                      <td className="py-2 pr-4">{formatDA(inv.amount)}</td>
                      <td className="py-2 pr-4"><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="py-2 flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => sendReminder.mutate({ invoiceId: inv.id })}><Send className="h-3 w-3" /></Button>
                        <Link href={`/admin/billing/invoices/${inv.id}/print`} target="_blank">
                          <Button variant="outline" size="sm"><Printer className="h-3 w-3" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-400">Aucune facture</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Plan Changes */}
        <TabsContent value="plan-changes">
          <div className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setShowChangePlan(true)}>Changer de plan</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Ancien plan</th>
                  <th className="py-2 pr-4">Nouveau plan</th>
                  <th className="py-2 pr-4">Tarif</th>
                  <th className="py-2">Raison</th>
                </tr></thead>
                <tbody>
                  {planChanges.map((pc) => (
                    <tr key={pc.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4">{formatDate(pc.effectiveAt)}</td>
                      <td className="py-2 pr-4"><PlanBadge plan={pc.fromPlan} /></td>
                      <td className="py-2 pr-4"><PlanBadge plan={pc.toPlan} /></td>
                      <td className="py-2 pr-4">{formatDA(pc.fromFee)} → {formatDA(pc.toFee)}</td>
                      <td className="py-2 text-gray-500">{pc.reason ?? "—"}</td>
                    </tr>
                  ))}
                  {planChanges.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">Aucun changement</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Notes */}
        <TabsContent value="notes">
          <div className="mt-4 space-y-4 max-w-2xl">
            {notes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span className="font-medium">{note.author.name}</span>
                  <span>{formatDate(note.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-gray-400 text-sm">Aucune note.</p>}
            <div className="border rounded-lg p-4 space-y-2">
              <Textarea placeholder="Ajouter une note..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} rows={3} />
              <Button size="sm" onClick={() => { if (noteContent.trim()) addNote.mutate({ clinicId, content: noteContent }); }} disabled={addNote.isPending || !noteContent.trim()}>
                Enregistrer
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500">Montant (DA)</label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Date</label><Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm((p) => ({ ...p, date: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Méthode</label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(METHOD_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-gray-500">Référence</label><Input value={paymentForm.reference} onChange={(e) => setPaymentForm((p) => ({ ...p, reference: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Nom du payeur</label><Input value={paymentForm.payerName} onChange={(e) => setPaymentForm((p) => ({ ...p, payerName: e.target.value }))} /></div>
            {unpaidInvoices.length > 0 && (
              <div><label className="text-xs text-gray-500">Facture (optionnel)</label>
                <Select value={paymentForm.invoiceId} onValueChange={(v) => setPaymentForm((p) => ({ ...p, invoiceId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune</SelectItem>
                    {unpaidInvoices.map((inv) => <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber} — {formatDA(inv.amount)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><label className="text-xs text-gray-500">Notes</label><Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecordPayment(false)}>Annuler</Button>
            <Button disabled={recordPayment.isPending} onClick={() => {
              recordPayment.mutate({
                clinicId,
                amount: Number(paymentForm.amount),
                paymentDate: paymentForm.date,
                paymentMethod: paymentForm.method as "bank_transfer" | "ccp" | "baridimob" | "cash" | "card",
                transactionReference: paymentForm.reference || undefined,
                payerName: paymentForm.payerName || undefined,
                invoiceId: paymentForm.invoiceId || undefined,
                notes: paymentForm.notes || undefined,
              });
            }}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog */}
      <Dialog open={showGenerateInvoice} onOpenChange={setShowGenerateInvoice}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Générer une facture</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs text-gray-500">Période</label><Input placeholder="ex: Mai 2025" value={invoiceForm.period} onChange={(e) => setInvoiceForm((f) => ({ ...f, period: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Montant (DA)</label><Input type="number" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Remise (DA)</label><Input type="number" value={invoiceForm.discountAmount} onChange={(e) => setInvoiceForm((f) => ({ ...f, discountAmount: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Date d&apos;échéance</label><Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm((f) => ({ ...f, dueDate: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Notes</label><Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="overageChk" checked={invoiceForm.includeOverage} onChange={(e) => setInvoiceForm((f) => ({ ...f, includeOverage: e.target.checked }))} />
              <label htmlFor="overageChk" className="text-sm">Inclure les dépassements</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateInvoice(false)}>Annuler</Button>
            <Button disabled={generateInvoice.isPending} onClick={() => {
              generateInvoice.mutate({
                clinicId,
                period: invoiceForm.period || undefined,
                amount: invoiceForm.amount ? Number(invoiceForm.amount) : undefined,
                discountAmount: invoiceForm.discountAmount ? Number(invoiceForm.discountAmount) : undefined,
                dueDate: invoiceForm.dueDate || undefined,
                notes: invoiceForm.notes || undefined,
                includeOverage: invoiceForm.includeOverage,
              });
            }}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Changer de plan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-gray-500">Plan actuel: <PlanBadge plan={plan} /></div>
            <div><label className="text-xs text-gray-500">Nouveau plan</label>
              <Select value={planForm.newPlan} onValueChange={(v) => setPlanForm((p) => ({ ...p, newPlan: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BASIC">BASIC</SelectItem>
                  <SelectItem value="PRO">PRO</SelectItem>
                  <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {planForm.newPlan === "ENTERPRISE" && (
              <div><label className="text-xs text-gray-500">Tarif personnalisé (DA)</label><Input type="number" value={planForm.newFee} onChange={(e) => setPlanForm((p) => ({ ...p, newFee: e.target.value }))} /></div>
            )}
            <div><label className="text-xs text-gray-500">Date d&apos;effet</label>
              <Select value={planForm.effectiveDate} onValueChange={(v) => setPlanForm((p) => ({ ...p, effectiveDate: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immédiat</SelectItem>
                  <SelectItem value="next_cycle">Prochain cycle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-gray-500">Raison</label><Textarea value={planForm.reason} onChange={(e) => setPlanForm((p) => ({ ...p, reason: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlan(false)}>Annuler</Button>
            <Button disabled={changePlan.isPending || !planForm.newPlan} onClick={() => {
              changePlan.mutate({
                clinicId,
                newPlan: planForm.newPlan as "BASIC" | "PRO" | "ENTERPRISE",
                newFee: planForm.newFee ? Number(planForm.newFee) : undefined,
                effectiveDate: planForm.effectiveDate as "immediate" | "next_cycle",
                reason: planForm.reason || undefined,
              });
            }}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annuler l&apos;abonnement</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Cette action annulera définitivement l&apos;abonnement de {clinic.name}.</p>
          <div><label className="text-xs text-gray-500">Raison (optionnel)</label><Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>Retour</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={cancelSubscription.isPending} onClick={() => cancelSubscription.mutate({ clinicId, reason: cancelReason || undefined })}>
              Confirmer l&apos;annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
