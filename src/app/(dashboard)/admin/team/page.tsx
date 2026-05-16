"use client";

// TODO: use admin-scoped listAll when available

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { Users, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const ROLE_LABELS: Record<string, string> = {
  CLINIC_OWNER: "Gérant",
  CLINIC_STAFF: "Personnel",
  CONFIRMATION_AGENT: "Agent",
  DOCTOR: "Médecin",
  SUPER_ADMIN: "Super Admin",
};

const ROLE_COLORS: Record<string, string> = {
  CLINIC_OWNER: "bg-purple-100 text-purple-800",
  CLINIC_STAFF: "bg-blue-100 text-blue-800",
  CONFIRMATION_AGENT: "bg-teal-100 text-teal-800",
  DOCTOR: "bg-green-100 text-green-800",
  SUPER_ADMIN: "bg-red-100 text-red-800",
};

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  avatar: string | null;
  createdAt: Date;
  invitedAt: Date | null;
};

export default function AdminTeamPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.team.list.useQuery({
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });

  const updateMut = trpc.team.update.useMutation({
    onSuccess: () => { utils.team.list.invalidate(); },
    onError: (e) => toast({ title: "Erreur", description: e.message }),
  });

  const members = (data ?? []) as Member[];
  const total = members.length;
  const superAdmins = members.filter((m) => m.role === "SUPER_ADMIN").length;
  const clinicUsers = members.filter((m) => ["CLINIC_OWNER", "CLINIC_STAFF", "DOCTOR"].includes(m.role)).length;
  const agents = members.filter((m) => m.role === "CONFIRMATION_AGENT").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <Users className="h-5 w-5 text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500">Tous les utilisateurs de la plateforme</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: total },
          { label: "Super Admins", value: superAdmins },
          { label: "Utilisateurs clinique", value: clinicUsers },
          { label: "Agents", value: agents },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="CLINIC_OWNER">Gérant</SelectItem>
            <SelectItem value="CLINIC_STAFF">Personnel</SelectItem>
            <SelectItem value="CONFIRMATION_AGENT">Agent</SelectItem>
            <SelectItem value="DOCTOR">Médecin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-gray-400">
            <Users className="h-10 w-10" />
            <p className="text-sm">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Membre", "Rôle", "Statut", "Depuis", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const roleLabel = ROLE_LABELS[m.role] ?? m.role;
                const roleColor = ROLE_COLORS[m.role] ?? "bg-gray-100 text-gray-700";
                return (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-semibold shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.email}</p>
                          {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleColor}`}>
                        {roleLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.isActive ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800">Actif</span>
                      ) : m.invitedAt ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800">Invité</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600">Inactif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {format(new Date(m.createdAt), "dd MMM yyyy", { locale: fr })}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {m.isActive ? (
                            <DropdownMenuItem
                              className="text-orange-600"
                              onClick={() => updateMut.mutate({ userId: m.id, isActive: false })}
                            >
                              Désactiver
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() => updateMut.mutate({ userId: m.id, isActive: true })}
                            >
                              Réactiver
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
