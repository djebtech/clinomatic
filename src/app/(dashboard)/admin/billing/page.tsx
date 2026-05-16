"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  DollarSign, TrendingUp, TrendingDown, Building2,
  AlertTriangle, CheckCircle, BarChart3, MoreVertical,
  ChevronLeft, ChevronRight, FileText,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function formatDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

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

function PaymentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    current: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    grace: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function CardSkeleton() {
  return <div className="h-28 animate-pulse rounded-lg bg-gray-100" />;
}

function RowSkeleton() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}

const PLAN_COLORS = ["#3b82f6", "#8b5cf6", "#eab308"];
const PIE_PLANS = ["BASIC", "PRO", "ENTERPRISE"] as const;

export default function BillingPage() {
  const utils = trpc.useUtils();
  const [period, setPeriod] = useState("this_month");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "cancelled">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "BASIC" | "PRO" | "ENTERPRISE">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "current" | "overdue" | "grace">("all");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const overview = trpc.billing.getOverview.useQuery();
  const revenueHistory = trpc.billing.getRevenueHistory.useQuery({ months: 12 });
  const quickStats = trpc.billing.getQuickStats.useQuery();
  const subscriptions = trpc.billing.getSubscriptions.useQuery({
    search: debouncedSearch || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    plan: planFilter !== "all" ? planFilter : undefined,
    paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
    page,
    pageSize: 10,
  });

  const bulkGenerate = trpc.billing.bulkGenerateInvoices.useMutation();
  const suspend = trpc.billing.suspendClinic.useMutation();
  const reactivate = trpc.billing.reactivateClinic.useMutation();
  const generateInvoice = trpc.billing.generateInvoice.useMutation();

  async function handleBulkGenerate() {
    const clinicIds = (subscriptions.data?.clinics ?? [])
      .filter((c) => c.isActive)
      .map((c) => c.id);
    try {
      await bulkGenerate.mutateAsync({ clinicIds });
      toast({ title: "Success", description: `Invoices generated for ${clinicIds.length} clinics` });
      await utils.billing.getSubscriptions.invalidate();
      await utils.billing.getOverview.invalidate();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error" });
    }
    setBulkOpen(false);
  }

  async function handleSuspend(clinicId: string) {
    try {
      await suspend.mutateAsync({ clinicId });
      toast({ title: "Success", description: "Clinic suspended" });
      await utils.billing.getSubscriptions.invalidate();
      await utils.billing.getOverview.invalidate();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  async function handleReactivate(clinicId: string) {
    try {
      await reactivate.mutateAsync({ clinicId });
      toast({ title: "Success", description: "Clinic reactivated" });
      await utils.billing.getSubscriptions.invalidate();
      await utils.billing.getOverview.invalidate();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  async function handleGenerateInvoice() {
    try {
      await generateInvoice.mutateAsync({ clinicId: selectedClinicId });
      toast({ title: "Success", description: "Invoice generated" });
      await utils.billing.getSubscriptions.invalidate();
      await utils.billing.getOverview.invalidate();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Unknown error" });
    }
    setInvoiceOpen(false);
  }

  const ov = overview.data;
  const qs = quickStats.data;
  const pageSize = 10;
  const totalPages = Math.ceil((subscriptions.data?.total ?? 0) / pageSize);

  const pieData = ov
    ? PIE_PLANS.map((p, i) => ({
        name: p,
        value: ov.planDistribution[p] ?? 0,
        color: PLAN_COLORS[i],
      }))
    : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <DollarSign className="h-5 w-5 text-teal-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Subscriptions</h1>
            <p className="text-sm text-gray-500">Manage revenue, invoices, and subscriptions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => toast({ title: "Export", description: "Export coming soon" })}>
            Export
          </Button>
          <Button onClick={() => setBulkOpen(true)}>Generate Invoices</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {overview.isLoading ? (
          [...Array(6)].map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <Card className="border-l-4 border-l-teal-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">MRR</p>
                  <TrendingUp className="h-5 w-5 text-teal-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatDA(ov?.mrr ?? 0)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {(ov?.mrrGrowth ?? 0) >= 0 ? "↑" : "↓"} {Math.abs(ov?.mrrGrowth ?? 0).toFixed(1)}% vs last month
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">ARR</p>
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatDA(ov?.arr ?? 0)}</p>
                <p className="mt-1 text-xs text-gray-500">Projected annual revenue</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                  <Building2 className="h-5 w-5 text-green-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{ov?.activeClinics ?? 0} clinics</p>
                <p className="mt-1 text-xs text-gray-500">
                  BASIC: {ov?.planDistribution.BASIC ?? 0} · PRO: {ov?.planDistribution.PRO ?? 0} · ENT: {ov?.planDistribution.ENTERPRISE ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Outstanding Balance</p>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatDA(ov?.outstandingTotal ?? 0)}</p>
                <p className="mt-1 text-xs text-gray-500">Overdue &gt;30d: {formatDA(ov?.overdue30 ?? 0)}</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Collections This Month</p>
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{formatDA(ov?.collected ?? 0)}</p>
                <p className="mt-1 text-xs text-gray-500">Collection rate: {(ov?.collectionRate ?? 0).toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">Churn Rate</p>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <p className="mt-1 text-2xl font-bold text-gray-900">{(ov?.churnRate ?? 0).toFixed(1)}%</p>
                <p className="mt-1 text-xs text-gray-500">{ov?.cancelledThisMonth ?? 0} cancelled this month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue History (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueHistory.isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueHistory.data ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatDA(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="collections" name="Collections" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="invoiced" name="Invoiced" stroke="#9ca3af" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="newMrr" name="New MRR" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Plan Distribution + Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.isLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-center gap-4">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}: {entry.value}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickStats.isLoading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg bg-red-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-red-700">Overdue Clinics</p>
                    <p className="text-xs text-red-500">Require immediate attention</p>
                  </div>
                  <span className="text-2xl font-bold text-red-700">{qs?.overdueCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-yellow-700">Renewing Soon</p>
                    <p className="text-xs text-yellow-500">Next 7 days</p>
                  </div>
                  <span className="text-2xl font-bold text-yellow-700">{qs?.renewingSoon ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cancelled Recently</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                  <span className="text-2xl font-bold text-gray-700">{qs?.cancelledRecently ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Input
              placeholder="Search clinics..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-56"
            />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v as typeof planFilter); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="BASIC">BASIC</SelectItem>
                <SelectItem value="PRO">PRO</SelectItem>
                <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as typeof paymentFilter); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="grace">Grace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Clinic</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Last Payment</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscriptions.isLoading ? (
                  [...Array(5)].map((_, i) => <RowSkeleton key={i} />)
                ) : subscriptions.data?.clinics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No clinics found</td>
                  </tr>
                ) : (
                  subscriptions.data?.clinics.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {clinic.logo ? (
                            <img src={clinic.logo} alt={clinic.name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                              {clinic.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{clinic.name}</p>
                            <p className="text-xs text-gray-400">{clinic.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <PlanBadge plan={clinic.subscriptionPlan} />
                          <p className="text-xs text-gray-400">{formatDA(clinic.monthlyFee)}/mo</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <PaymentBadge status={clinic.paymentStatus} />
                          {clinic.paymentStatus === "overdue" && clinic.daysOverdue > 0 && (
                            <p className="text-xs text-red-500">{clinic.daysOverdue} days overdue</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {clinic.balance >= 0 ? (
                          <span className="font-medium text-green-600">+ {formatDA(clinic.balance)} credit</span>
                        ) : (
                          <span className="font-medium text-red-600">- {formatDA(Math.abs(clinic.balance))}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {clinic.lastPaymentDate ? (
                          <div>
                            <p>{new Date(clinic.lastPaymentDate).toLocaleDateString("fr-DZ")}</p>
                            <p className="text-xs">{clinic.lastPaymentAmount != null ? formatDA(clinic.lastPaymentAmount) : ""}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/billing/subscriptions/${clinic.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSuspend(clinic.id)}>
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleReactivate(clinic.id)}>
                              Reactivate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setSelectedClinicId(clinic.id); setInvoiceOpen(true); }}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Generate Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>
              Total: {subscriptions.data?.total ?? 0} clinics
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {page} of {totalPages || 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Generate Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoices</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            This will generate invoices for all active clinics. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkGenerate} disabled={bulkGenerate.isPending}>
              {bulkGenerate.isPending ? "Generating..." : "Generate All"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Generate an invoice for this clinic for the current period.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateInvoice} disabled={generateInvoice.isPending}>
              {generateInvoice.isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
