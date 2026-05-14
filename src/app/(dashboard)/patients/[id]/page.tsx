"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Edit } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: patient, isLoading } = trpc.patient.getById.useQuery({ id });

  if (isLoading) return <PageLoader />;
  if (!patient) return <div className="text-center py-12 text-gray-400">Patient introuvable</div>;

  const totalSpent = patient.appointments.filter((a) => a.paid).reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/patients"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
            <p className="text-gray-500 text-sm">ID: {patient.id.slice(-8)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/appointments/new?patientId=${patient.id}`}>
              <Calendar className="h-4 w-4" />
              Nouveau RDV
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient info */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle>Coordonnées</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${patient.phone}`} className="text-teal-600 hover:underline">{patient.phone}</a>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{patient.address}</span>
                </div>
              )}
              {patient.gender && (
                <div className="text-sm text-gray-600">
                  Genre: <span className="font-medium">{patient.gender === "MALE" ? "Homme" : "Femme"}</span>
                </div>
              )}
              {patient.source && (
                <div className="text-sm text-gray-600">
                  Source: <Badge variant="secondary" className="capitalize">{patient.source}</Badge>
                </div>
              )}
              {patient.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {patient.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Statistiques</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total RDV</span>
                <span className="font-semibold">{patient.appointments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dépenses totales</span>
                <span className="font-semibold">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Inscrit le</span>
                <span className="font-semibold">{formatDate(patient.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {patient.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{patient.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Appointments */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historique des rendez-vous ({patient.appointments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.appointments.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Aucun rendez-vous</p>
              ) : (
                <div className="space-y-3">
                  {patient.appointments.map((apt) => (
                    <Link key={apt.id} href={`/appointments/${apt.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-teal-200 hover:bg-teal-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{apt.service.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(apt.date)}</p>
                        {apt.doctor && <p className="text-xs text-gray-400">Dr. {apt.doctor.name}</p>}
                      </div>
                      <div className="text-right">
                        <StatusBadge status={apt.status} />
                        <p className="text-xs text-gray-500 mt-1">{formatCurrency(apt.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
