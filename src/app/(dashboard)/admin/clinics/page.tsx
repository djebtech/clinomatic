"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Search, MoreVertical, Eye, Pencil,
  ToggleLeft, ToggleRight, Trash2, ChevronLeft, ChevronRight,
  Users, DollarSign, Activity, Hospital,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/contexts/LanguageContext";

type StatusFilter = "all" | "active" | "inactive";

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    BASIC: "bg-blue-100 text-blue-700",
    PRO: "bg-purple-100 text-purple-700",
    ENTERPRISE: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[plan] ?? "bg-gray-100 text-gray-700"}`}>
      {plan}
    </span>
  );
}

function ClinicStatusBadge({ active }: { active: boolean }) {
  const t = useT();
  return active ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      {t("common.active")}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
      {t("common.inactive")}
    </span>
  );
}

function ClinicLogo({ logo, name }: { logo?: string | null; name: string }) {
  if (logo) return <img src={logo} alt={name} className="h-10 w-10 rounded-lg object-cover" />;
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
      <div className="h-7 w-16 rounded bg-gray-200" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-200 animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
        </td>
      ))}
    </tr>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {start > 1 && (<><Button variant="outline" size="sm" onClick={() => onPageChange(1)}>1</Button>{start > 2 && <span className="px-1 text-gray-400">…</span>}</>)}
      {pages.map((p) => (
        <Button key={p} size="sm" variant={p === page ? "default" : "outline"} onClick={() => onPageChange(p)}>{p}</Button>
      ))}
      {end < totalPages && (<>{end < totalPages - 1 && <span className="px-1 text-gray-400">…</span>}<Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)}>{totalPages}</Button></>)}
      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
        <Building2 className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-700">{t("clinics.not_found")}</p>
    </div>
  );
}

type ClinicRow = { id: string; isActive: boolean };

function ClinicActions({ clinic, onToggle, onDelete }: { clinic: ClinicRow; onToggle: () => void; onDelete: () => void }) {
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{t("common.actions")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/clinics/${clinic.id}`} className="flex items-center gap-2 cursor-pointer">
            <Eye className="h-4 w-4 text-gray-500" />{t("clinics.view_details")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/clinics/${clinic.id}/edit`} className="flex items-center gap-2 cursor-pointer">
            <Pencil className="h-4 w-4 text-gray-500" />{t("common.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
          {clinic.isActive ? (
            <><ToggleLeft className="h-4 w-4 text-orange-500" />{t("clinics.deactivate")}</>
          ) : (
            <><ToggleRight className="h-4 w-4 text-green-600" />{t("clinics.activate")}</>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />{t("common.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminClinicsPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [plan, setPlan] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const statsQuery = trpc.clinic.adminStats.useQuery();
  const listQuery = trpc.clinic.adminList.useQuery({
    search: search || undefined,
    status,
    plan: plan !== "all" ? plan : undefined,
    page,
    limit: 20,
  });

  const stats = statsQuery.data;
  const clinics = listQuery.data?.clinics ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;

  const toggleActive = trpc.clinic.adminToggleActive.useMutation({
    onSuccess: () => {
      toast({ title: t("clinics.toggle_success"), variant: "success" });
      utils.clinic.adminList.invalidate();
      utils.clinic.adminStats.invalidate();
    },
  });

  const deleteClinic = trpc.clinic.adminDelete.useMutation({
    onSuccess: () => {
      toast({ title: t("clinics.delete_success"), variant: "success" });
      setDeleteId(null);
      utils.clinic.adminList.invalidate();
      utils.clinic.adminStats.invalidate();
    },
  });

  function handleSearch(value: string) { setSearch(value); setPage(1); }
  function handleStatus(value: string) { setStatus(value as StatusFilter); setPage(1); }
  function handlePlan(value: string) { setPlan(value); setPage(1); }

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("clinics.title")}</h1>
          <p className="text-sm text-gray-600">{t("clinics.subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/clinics/new">
            <Hospital className="h-4 w-4" />
            {t("clinics.new")}
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsQuery.isLoading ? (
          <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">{t("clinics.total")}</CardTitle>
                  <Building2 className="h-4 w-4 text-teal-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">{t("clinics.active_count")}</CardTitle>
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stats?.active ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">{t("clinics.total_patients")}</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalPatients ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">{t("clinics.monthly_revenue")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{stats ? formatCurrency(stats.monthlyRevenue) : "—"}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder={t("clinics.search_placeholder")} value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder={t("clinics.filter_status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("clinics.all_status")}</SelectItem>
            <SelectItem value="active">{t("common.active")}</SelectItem>
            <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={plan} onValueChange={handlePlan}>
          <SelectTrigger className="w-44"><SelectValue placeholder={t("clinics.filter_plan")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("clinics.all_plans")}</SelectItem>
            <SelectItem value="BASIC">BASIC</SelectItem>
            <SelectItem value="PRO">PRO</SelectItem>
            <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.name")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.city")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.phone")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.patients_count")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.plan")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.monthly_fee")}</th>
                <th className="px-4 py-3 font-medium text-gray-600">{t("clinics.status")}</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">{t("clinics.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {listQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : clinics.length === 0 ? (
                <tr><td colSpan={8}><EmptyState /></td></tr>
              ) : (
                clinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClinicLogo logo={clinic.logo} name={clinic.name} />
                        <div>
                          <p className="font-medium text-gray-900">{clinic.name}</p>
                          <p className="text-xs text-gray-500">{clinic.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{clinic.city ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{clinic.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{clinic._count.patients}</td>
                    <td className="px-4 py-3"><PlanBadge plan={clinic.subscriptionPlan} /></td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(clinic.monthlyFee)}</td>
                    <td className="px-4 py-3"><ClinicStatusBadge active={clinic.isActive} /></td>
                    <td className="px-4 py-3 text-right">
                      <ClinicActions clinic={clinic} onToggle={() => toggleActive.mutate({ id: clinic.id })} onDelete={() => setDeleteId(clinic.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {listQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1"><div className="h-4 w-32 rounded bg-gray-200 mb-1" /><div className="h-3 w-20 rounded bg-gray-200" /></div>
              </div>
              <div className="h-4 w-24 rounded bg-gray-200" />
            </div>
          ))
        ) : clinics.length === 0 ? <EmptyState /> : (
          clinics.map((clinic) => (
            <Card key={clinic.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ClinicLogo logo={clinic.logo} name={clinic.name} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{clinic.name}</p>
                      <p className="text-xs text-gray-500">{clinic.city ?? "—"}</p>
                    </div>
                  </div>
                  <ClinicActions clinic={clinic} onToggle={() => toggleActive.mutate({ id: clinic.id })} onDelete={() => setDeleteId(clinic.id)} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PlanBadge plan={clinic.subscriptionPlan} />
                  <ClinicStatusBadge active={clinic.isActive} />
                  <span className="text-xs text-gray-600">{clinic._count.patients} {t("patients.title").toLowerCase()}</span>
                  <span className="text-xs text-gray-600">{formatCurrency(clinic.monthlyFee)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/admin/clinics/${clinic.id}`}><Eye className="h-3 w-3" />{t("common.view")}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/admin/clinics/${clinic.id}/edit`}><Pencil className="h-3 w-3" />{t("common.edit")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Delete confirm dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{t("common.delete")}</DialogTitle>
            <DialogDescription>{t("clinics.delete_confirm")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" disabled={deleteClinic.isPending} onClick={() => { if (deleteId) deleteClinic.mutate({ id: deleteId }); }}>
              {deleteClinic.isPending ? t("common.loading") : t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
