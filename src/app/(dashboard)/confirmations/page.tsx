"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Phone, MessageCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default function ConfirmationsPage() {
  const utils = trpc.useUtils();
  const { data: queue, isLoading } = trpc.confirmation.getQueue.useQuery({});
  const assignToMe = trpc.confirmation.assignToMe.useMutation({
    onSuccess: () => utils.confirmation.getQueue.invalidate(),
  });
  const confirm = trpc.confirmation.confirm.useMutation({
    onSuccess: () => utils.confirmation.getQueue.invalidate(),
  });
  const cancel = trpc.confirmation.markCancelled.useMutation({
    onSuccess: () => utils.confirmation.getQueue.invalidate(),
  });
  const sendConfirmation = trpc.whatsapp.sendConfirmation.useMutation();

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">File de confirmation</h1>
        <p className="text-gray-500 text-sm">
          طابور التأكيد — {queue?.length ?? 0} rendez-vous en attente
        </p>
      </div>

      {queue?.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">File vide!</p>
          <p className="text-gray-400 text-sm">Tous les rendez-vous ont été traités.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue?.map((apt) => (
            <Card key={apt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Time & status */}
                  <div className="text-center w-16 flex-shrink-0">
                    <div className="bg-teal-50 rounded-lg p-2">
                      <p className="text-xs text-teal-600 font-medium">
                        {new Date(apt.date).toLocaleDateString("fr", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-lg font-bold text-teal-700">
                        {new Date(apt.date).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <Badge variant={apt.status === "CONFIRMING" ? "default" : "warning"} className="mt-1 text-xs">
                      {apt.status === "CONFIRMING" ? "En cours" : "En attente"}
                    </Badge>
                  </div>

                  {/* Patient & details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/patients/${apt.patientId}`} className="font-semibold text-gray-900 hover:text-teal-600">
                        {apt.patient.name}
                      </Link>
                      <span className="text-gray-400 text-xs capitalize">via {apt.source}</span>
                    </div>
                    <p className="text-sm text-gray-600">{apt.service.name} — {formatCurrency(apt.price)}</p>
                    <p className="text-xs text-gray-400">{apt.clinic.name}</p>
                    {apt.confirmAttempts > 0 && (
                      <p className="text-xs text-orange-500 mt-1">
                        <Clock className="h-3 w-3 inline" /> {apt.confirmAttempts} tentative(s)
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      asChild
                    >
                      <a href={`tel:${apt.patient.phone}`}>
                        <Phone className="h-3 w-3" />
                        Appeler
                      </a>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                      onClick={() => {
                        assignToMe.mutate({ appointmentId: apt.id });
                        sendConfirmation.mutate({ appointmentId: apt.id });
                      }}
                    >
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp
                    </Button>

                    <Button
                      size="sm"
                      className="gap-1 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => confirm.mutate({ appointmentId: apt.id, method: "call" })}
                      disabled={confirm.isPending}
                    >
                      <CheckCircle className="h-3 w-3" />
                      Confirmé
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1 text-xs"
                      onClick={() => cancel.mutate({ appointmentId: apt.id })}
                      disabled={cancel.isPending}
                    >
                      <XCircle className="h-3 w-3" />
                      Annuler
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
