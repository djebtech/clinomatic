"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, Clock, LogIn, LogOut, Calendar, Edit2, X, UserPlus, User,
  DollarSign, FileText, Zap, Settings, UserMinus, ChevronRight, ChevronDown,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

const PAGE_SIZE = 20;

type ActionMeta = { label: string; icon: React.ElementType; color: string };

const ACTION_MAP: Record<string, ActionMeta> = {
  USER_LOGIN:           { label: "Connexion",              icon: LogIn,      color: "text-green-600" },
  USER_LOGOUT:          { label: "Déconnexion",            icon: LogOut,     color: "text-gray-500" },
  APPOINTMENT_CREATED:  { label: "RDV créé",               icon: Calendar,   color: "text-blue-600" },
  APPOINTMENT_UPDATED:  { label: "RDV modifié",            icon: Edit2,      color: "text-blue-500" },
  APPOINTMENT_CANCELLED:{ label: "RDV annulé",             icon: X,          color: "text-red-500" },
  PATIENT_CREATED:      { label: "Patient créé",           icon: UserPlus,   color: "text-teal-600" },
  PATIENT_UPDATED:      { label: "Patient modifié",        icon: User,       color: "text-teal-500" },
  PAYMENT_RECORDED:     { label: "Paiement enregistré",    icon: DollarSign, color: "text-green-600" },
  INVOICE_GENERATED:    { label: "Facture générée",        icon: FileText,   color: "text-blue-600" },
  PLAN_CHANGED:         { label: "Plan changé",            icon: Zap,        color: "text-purple-600" },
  SETTINGS_UPDATED:     { label: "Paramètres modifiés",   icon: Settings,   color: "text-gray-600" },
  TEAM_MEMBER_ADDED:    { label: "Membre ajouté",          icon: UserPlus,   color: "text-teal-600" },
  TEAM_MEMBER_REMOVED:  { label: "Membre retiré",          icon: UserMinus,  color: "text-red-500" },
};

const ACTION_FILTER_OPTIONS = [
  { label: "Toutes", value: "ALL" },
  { label: "Connexion", value: "USER_LOGIN" },
  { label: "Rendez-vous", value: "APPOINTMENT" },
  { label: "Patient", value: "PATIENT_CREATED" },
  { label: "Paiement", value: "PAYMENT_RECORDED" },
  { label: "Paramètres", value: "SETTINGS_UPDATED" },
  { label: "Équipe", value: "TEAM_MEMBER_ADDED" },
];

function actionFilterToQuery(v: string): string | undefined {
  if (v === "ALL" || !v) return undefined;
  return v;
}

function getActionMeta(action: string): ActionMeta {
  return ACTION_MAP[action] ?? { label: action, icon: Activity, color: "text-gray-500" };
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-700",
    DOCTOR: "bg-blue-100 text-blue-700",
    STAFF: "bg-gray-100 text-gray-600",
    SUPER_ADMIN: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[role] ?? "bg-gray-100 text-gray-600"}`}>
      {role}
    </span>
  );
}

export default function ActivityPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [userId, setUserId] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Applied filter state (only committed on "Filtrer")
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "ALL",
    action: "ALL",
  });

  const { data: usersData } = trpc.activityLog.getUsers.useQuery();

  const { data, isLoading } = trpc.activityLog.list.useQuery({
    page,
    pageSize: PAGE_SIZE,
    startDate: appliedFilters.startDate || undefined,
    endDate: appliedFilters.endDate || undefined,
    userId: appliedFilters.userId !== "ALL" ? appliedFilters.userId : undefined,
    action: actionFilterToQuery(appliedFilters.action),
  });

  function applyFilters() {
    setPage(1);
    setAppliedFilters({ startDate, endDate, userId, action: actionFilter });
  }

  function resetFilters() {
    setStartDate("");
    setEndDate("");
    setUserId("ALL");
    setActionFilter("ALL");
    setPage(1);
    setAppliedFilters({ startDate: "", endDate: "", userId: "ALL", action: "ALL" });
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-teal-600" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Journal d&apos;activité</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">Historique de toutes les actions importantes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-xs text-gray-500">Du</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-xs text-gray-500">Au</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm h-9"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs text-gray-500">Utilisateur</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {usersData?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs text-gray-500">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyFilters} className="h-9 bg-teal-600 hover:bg-teal-700 text-white">
              Filtrer
            </Button>
            <Button onClick={resetFilters} variant="outline" className="h-9">
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Result count */}
          {!isLoading && data && (
            <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-500">
              {data.total} résultat{data.total !== 1 ? "s" : ""}
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Date / Heure</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Utilisateur</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Action</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Cible</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">IP</th>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && [...Array(8)].map((_, i) => <SkeletonRow key={i} />)}

              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-medium text-gray-600">Aucune activité trouvée</p>
                    <p className="text-xs text-gray-400 mt-1">Essayez de modifier les filtres</p>
                  </td>
                </tr>
              )}

              {!isLoading && data?.items.map((item) => {
                const meta = getActionMeta(item.action);
                const Icon = meta.icon;
                const isExpanded = expandedRows.has(item.id);
                const hasDetails = item.details && Object.keys(item.details as object).length > 0;

                return (
                  <>
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-gray-900 text-xs font-medium">
                          {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                        </p>
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                        </p>
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        {item.user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {item.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-gray-900 text-xs font-medium leading-tight">{item.user.name}</p>
                              <RoleBadge role={item.user.role} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Système</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${meta.color}`} />
                          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {item.targetType && (
                          <span className="text-gray-400 mr-1">{item.targetType}:</span>
                        )}
                        {item.targetName ?? (item.targetId ? `#${item.targetId.slice(-6)}` : "—")}
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                        {item.ipAddress ?? "—"}
                      </td>

                      {/* Expand */}
                      <td className="px-2 py-3">
                        {hasDetails && (
                          <button
                            onClick={() => toggleRow(item.id)}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRight className="h-3.5 w-3.5" />
                            }
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded details */}
                    {isExpanded && hasDetails && (
                      <tr key={`${item.id}-details`} className="bg-gray-50 border-b border-gray-100">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="bg-gray-100 text-xs rounded p-3 overflow-x-auto text-gray-700 max-h-48">
                            {JSON.stringify(item.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-gray-500">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
