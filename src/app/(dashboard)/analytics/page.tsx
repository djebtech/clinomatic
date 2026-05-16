"use client";

import { useState } from "react";
import { subDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Users,
  UserCheck,
  Loader2,
  AlertTriangle,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useT } from "@/contexts/LanguageContext";
import { cn, calculatePercentageChange } from "@/lib/utils";
import { TrendChart } from "@/components/analytics/TrendChart";
import { RevenueChart } from "@/components/analytics/RevenueChart";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d";

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  instagram: "#e1306c",
  facebook: "#1877f2",
  whatsapp: "#25d366",
  phone: "#f59e0b",
  walk_in: "#6366f1",
  public_booking: "#0d9488",
  manual: "#6b7280",
};

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  phone: "Phone",
  walk_in: "Walk-in",
  public_booking: "Online",
  manual: "Manual",
};

const FALLBACK_COLORS = [
  "#0d9488",
  "#0891b2",
  "#7c3aed",
  "#ea580c",
  "#84cc16",
  "#f43f5e",
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
}

function KpiCard({ title, value, change, icon, iconBg }: KpiCardProps) {
  const hasChange = change !== undefined && change !== null && !isNaN(change);
  const isPositive = hasChange && change >= 0;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 font-medium truncate pr-2">{title}</span>
        <div className={cn("p-2 rounded-lg shrink-0", iconBg)}>{icon}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
        {hasChange && (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-semibold shrink-0",
              isPositive ? "text-emerald-600" : "text-red-500"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isPositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      {hasChange && (
        <p className="text-xs text-gray-400">vs previous period</p>
      )}
    </div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

interface RecommendationProps {
  type: "warning" | "danger" | "success";
  title: string;
  description: string;
}

function RecommendationCard({ type, title, description }: RecommendationProps) {
  const styles = {
    warning: {
      wrapper: "bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      titleColor: "text-amber-800",
      descColor: "text-amber-700",
    },
    danger: {
      wrapper: "bg-red-50 border-red-200",
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      titleColor: "text-red-800",
      descColor: "text-red-700",
    },
    success: {
      wrapper: "bg-emerald-50 border-emerald-200",
      icon: <ThumbsUp className="h-5 w-5 text-emerald-500" />,
      titleColor: "text-emerald-800",
      descColor: "text-emerald-700",
    },
  };
  const s = styles[type];
  return (
    <div className={cn("rounded-xl border p-4 flex gap-3 items-start", s.wrapper)}>
      <div className="mt-0.5 shrink-0">{s.icon}</div>
      <div>
        <p className={cn("font-semibold text-sm", s.titleColor)}>{title}</p>
        <p className={cn("text-sm mt-0.5", s.descColor)}>{description}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const t = useT();
  const [period, setPeriod] = useState<Period>("30d");

  const endDate = new Date();
  const startDate =
    period === "7d"
      ? subDays(endDate, 7)
      : period === "30d"
      ? subDays(endDate, 30)
      : subDays(endDate, 90);

  const { data, isLoading } = trpc.analytics.getDashboard.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: trendData, isLoading: trendLoading } =
    trpc.analytics.getWeeklyTrend.useQuery({
      weeks: period === "7d" ? 4 : period === "30d" ? 8 : 12,
    });

  const { data: revenueData, isLoading: revenueLoading } =
    trpc.analytics.getMonthlyRevenue.useQuery({
      months: period === "7d" ? 3 : period === "30d" ? 6 : 12,
    });

  // ── Derived KPIs ────────────────────────────────────────────────────────────

  const thisWeek = data?.thisWeek ?? {
    bookings: 0,
    revenue: 0,
    confirmed: 0,
    attended: 0,
    noShows: 0,
  };
  const lastWeek = data?.lastWeek ?? { bookings: 0, revenue: 0 };

  const total = thisWeek.bookings;
  const { confirmed, attended, noShows } = thisWeek;

  const confirmationRate =
    total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const noShowRate =
    attended + noShows > 0
      ? Math.round((noShows / (attended + noShows)) * 100)
      : 0;

  const bookingChange = calculatePercentageChange(
    thisWeek.bookings,
    lastWeek.bookings
  );
  const revenueChange = calculatePercentageChange(
    thisWeek.revenue,
    lastWeek.revenue
  );

  // ── Source pie data ──────────────────────────────────────────────────────────

  const pieData = (data?.bySource ?? []).map((d, i) => ({
    name: SOURCE_LABELS[d.source] ?? d.source,
    value: d._count.id,
    color: SOURCE_COLORS[d.source] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  // ── Recommendations ──────────────────────────────────────────────────────────

  const recommendations: RecommendationProps[] = [];
  if (noShowRate > 15) {
    recommendations.push({
      type: "danger",
      title: "High no-show rate",
      description: `Your no-show rate is ${noShowRate}%. Enable WhatsApp reminders to reduce missed appointments.`,
    });
  }
  if (confirmationRate < 60 && total > 0) {
    recommendations.push({
      type: "warning",
      title: "Low confirmation rate",
      description: `Only ${confirmationRate}% of bookings are confirmed. Consider assigning more agents to follow up faster.`,
    });
  }
  if (bookingChange > 5) {
    recommendations.push({
      type: "success",
      title: "Bookings are growing",
      description: `Bookings increased by ${bookingChange.toFixed(1)}% vs the previous period. Great work!`,
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            {t("analytics.title")}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{t("analytics.subtitle")}</p>
        </div>

        {/* Period selector */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1 self-start sm:self-auto">
          {(["7d", "30d", "90d"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                period === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Initial loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
            <KpiCard
              title="Total Bookings"
              value={total}
              change={bookingChange}
              icon={<Calendar className="h-4 w-4 text-teal-600" />}
              iconBg="bg-teal-50"
            />
            <KpiCard
              title="Confirmed"
              value={confirmed}
              icon={<CheckCircle className="h-4 w-4 text-blue-600" />}
              iconBg="bg-blue-50"
            />
            <KpiCard
              title="Revenue"
              value={
                thisWeek.revenue >= 1000
                  ? `${(thisWeek.revenue / 1000).toFixed(1)}K DA`
                  : `${thisWeek.revenue} DA`
              }
              change={revenueChange}
              icon={<DollarSign className="h-4 w-4 text-purple-600" />}
              iconBg="bg-purple-50"
            />
            <KpiCard
              title="No-show Rate"
              value={`${noShowRate}%`}
              icon={<XCircle className="h-4 w-4 text-red-500" />}
              iconBg="bg-red-50"
            />
            <KpiCard
              title="Confirmation Rate"
              value={`${confirmationRate}%`}
              icon={<Users className="h-4 w-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
            />
            <KpiCard
              title="Attended"
              value={attended}
              icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
            />
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">Weekly Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Booking activity over time
              </p>
            </div>
            {trendLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              </div>
            ) : (
              <TrendChart data={trendData ?? []} />
            )}
          </div>

          {/* Revenue + Source */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Revenue Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Monthly Revenue</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Revenue in DA (thousands)
                </p>
              </div>
              {revenueLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                </div>
              ) : (
                <RevenueChart data={revenueData ?? []} />
              )}
            </div>

            {/* Source Donut */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">Booking Sources</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Where your bookings come from
                </p>
              </div>
              {pieData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                  No source data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value)} bookings`,
                      ]}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Services Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Top Services</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Most booked services in this period
              </p>
            </div>
            {(data?.topServices ?? []).length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                No service data available
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Service
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Bookings
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data?.topServices ?? []).map((svc, i) => {
                      const name =
                        svc.service?.name ?? svc.service?.nameAr ?? "Unknown";
                      const count = svc._count.id;
                      const rev = svc._sum.price ?? 0;
                      return (
                        <tr
                          key={i}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-5 py-3 font-medium text-gray-800">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                                }}
                              />
                              {name}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-gray-700 font-semibold">
                            {count}
                          </td>
                          <td className="px-5 py-3 text-right text-gray-700 font-semibold">
                            {rev >= 1000
                              ? `${(rev / 1000).toFixed(1)}K DA`
                              : `${rev} DA`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-teal-600" />
                <h2 className="font-semibold text-gray-900">Recommendations</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations.map((r, i) => (
                  <RecommendationCard key={i} {...r} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
