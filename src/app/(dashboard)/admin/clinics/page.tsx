"use client";

import { trpc } from "@/lib/trpc";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function AdminClinicsPage() {
  const utils = trpc.useUtils();
  const { data: clinics, isLoading } = trpc.admin.getAllClinics.useQuery();
  const toggleClinic = trpc.admin.toggleClinic.useMutation({ onSuccess: () => utils.admin.getAllClinics.invalidate() });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des cliniques</h1>
          <p className="text-gray-500 text-sm">إدارة العيادات — {clinics?.length} cliniques</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clinique</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Patients</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">WhatsApp</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Inscrit</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {clinics?.map((clinic) => (
              <tr key={clinic.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{clinic.name}</p>
                    <p className="text-xs text-gray-500">{clinic.city} — {clinic.phone}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{clinic.subscriptionPlan}</Badge>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(clinic.monthlyFee)}/mois</p>
                </td>
                <td className="px-4 py-3 text-sm">{clinic._count.patients}</td>
                <td className="px-4 py-3">
                  <MessageCircle className={`h-4 w-4 ${clinic.whatsappConfig?.isConnected ? "text-green-500" : "text-gray-300"}`} />
                </td>
                <td className="px-4 py-3">
                  <Badge variant={clinic.isActive ? "success" : "secondary"}>
                    {clinic.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(clinic.createdAt)}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant={clinic.isActive ? "destructive" : "outline"}
                    onClick={() => toggleClinic.mutate({ id: clinic.id, isActive: !clinic.isActive })}
                    disabled={toggleClinic.isPending}
                  >
                    {clinic.isActive ? "Désactiver" : "Activer"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
