"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import { Search, UserPlus, Phone, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, fetchNextPage, hasNextPage } = trpc.patient.list.useInfiniteQuery(
    { search, limit: 50 },
    { getNextPageParam: (last) => last.nextCursor }
  );

  const patients = data?.pages.flatMap((p) => p.patients) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm">المرضى — {patients.length} patients</p>
        </div>
        <Button asChild>
          <Link href="/patients/new">
            <UserPlus className="h-4 w-4" />
            Nouveau patient
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher un patient..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {patients.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-lg">Aucun patient trouvé</p>
              <p className="text-sm mt-1">لم يتم العثور على مرضى</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">RDV</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${patient.id}`} className="font-medium text-gray-900 hover:text-teal-600">
                        {patient.name}
                      </Link>
                      {patient.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {patient.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${patient.phone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-teal-600">
                        <Phone className="h-3 w-3" />
                        {patient.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {patient.source && (
                        <Badge variant="secondary" className="capitalize">{patient.source}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {patient._count.appointments}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(patient.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {hasNextPage && (
            <div className="p-4 border-t border-gray-100 text-center">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                Charger plus
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
