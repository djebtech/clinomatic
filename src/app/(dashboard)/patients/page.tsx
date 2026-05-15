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
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-xs md:text-sm">المرضى — {patients.length} patients</p>
        </div>
        <Button asChild size="sm" className="flex-shrink-0">
          <Link href="/patients/new">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Nouveau patient</span>
            <span className="sm:hidden ml-1">+ Patient</span>
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher un patient..."
          className="pl-9 max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg">Aucun patient trouvé</p>
          <p className="text-sm mt-1">لم يتم العثور على مرضى</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE: card list ── */}
          <div className="md:hidden space-y-2">
            {patients.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                  {patient.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{patient.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={`tel:${patient.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-gray-500"
                    >
                      <Phone className="h-3 w-3" />
                      {patient.phone}
                    </a>
                  </div>
                  {patient.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {patient.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* RDV count + source */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{patient._count.appointments}</span>
                  </div>
                  {patient.source && (
                    <Badge variant="secondary" className="text-xs px-1.5 capitalize">
                      {patient.source}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* ── DESKTOP: table ── */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
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
          </div>

          {hasNextPage && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                Charger plus
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
