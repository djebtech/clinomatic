"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, MessageCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatCurrency } from "@/lib/utils";

export default function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const utils = trpc.useUtils();
  const { data: apt, isLoading } = trpc.appointment.getById.useQuery({ id });
  const updateStatus = trpc.appointment.updateStatus.useMutation({
    onSuccess: () => utils.appointment.getById.invalidate({ id }),
  });
  const sendConfirmation = trpc.whatsapp.sendConfirmation.useMutation();
  const markPaid = trpc.appointment.markPaid.useMutation({
    onSuccess: () => utils.appointment.getById.invalidate({ id }),
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  if (isLoading) return <PageLoader />;
  if (!apt) return <div className="text-center py-12 text-gray-400">Rendez-vous introuvable</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/appointments"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
            <p className="text-gray-500 text-sm">{formatDateTime(apt.date)}</p>
          </div>
        </div>
        <StatusBadge status={apt.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Patient</span>
                <Link href={`/patients/${apt.patientId}`} className="font-medium text-teal-600 hover:underline">
                  {apt.patient.name}
                </Link>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service</span>
                <span className="font-medium">{apt.service.name}</span>
              </div>
              {apt.doctor && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Médecin</span>
                  <span className="font-medium">Dr. {apt.doctor.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Durée</span>
                <span className="font-medium">{apt.duration} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Source</span>
                <span className="capitalize font-medium">{apt.source}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prix</span>
                <span className="font-bold text-lg">{formatCurrency(apt.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paiement</span>
                <span className={`font-medium ${apt.paid ? "text-green-600" : "text-orange-500"}`}>
                  {apt.paid ? `Payé (${apt.paymentMethod})` : "Non payé"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp messages */}
          {apt.whatsappMessages.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Messages WhatsApp</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {apt.whatsappMessages.map((msg) => (
                    <div key={msg.id} className={`text-xs p-2 rounded-lg ${msg.direction === "OUTBOUND" ? "bg-teal-50 text-teal-800 ml-4" : "bg-gray-50 mr-4"}`}>
                      <p className="font-medium capitalize">{msg.messageType.replace(/_/g, " ")}</p>
                      <p className="mt-0.5">{msg.content.slice(0, 100)}...</p>
                      <p className="text-gray-400 mt-1">{new Date(msg.sentAt).toLocaleString("fr")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => sendConfirmation.mutate({ appointmentId: apt.id })}
                disabled={sendConfirmation.isPending}
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Envoyer WhatsApp
              </Button>

              {apt.status === "PENDING" || apt.status === "CONFIRMING" ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => updateStatus.mutate({ id: apt.id, status: "CONFIRMED" })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Confirmer
                </Button>
              ) : null}

              {apt.status === "CONFIRMED" && (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => updateStatus.mutate({ id: apt.id, status: "ATTENDED" })}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marquer présent
                </Button>
              )}

              {(apt.status === "CONFIRMED" || apt.status === "PENDING") && (
                <Button
                  className="w-full gap-2"
                  variant="destructive"
                  onClick={() => updateStatus.mutate({ id: apt.id, status: "NO_SHOW" })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4" />
                  Marquer absent
                </Button>
              )}

              {!apt.status.includes("CANCEL") && apt.status !== "ATTENDED" && (
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: apt.id, status: "CANCELLED" })}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                  Annuler
                </Button>
              )}

              {!apt.paid && (
                <Button
                  className="w-full gap-2"
                  variant="outline"
                  onClick={() => markPaid.mutate({ id: apt.id, paymentMethod: "cash" })}
                  disabled={markPaid.isPending}
                >
                  Marquer payé (espèces)
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`tel:${apt.patient.phone}`}>
                  <Phone className="h-4 w-4" />
                  {apt.patient.phone}
                </a>
              </Button>
              <Button variant="outline" className="w-full gap-2" asChild>
                <a href={`https://wa.me/213${apt.patient.phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
