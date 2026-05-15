"use client";

import { trpc } from "@/lib/trpc";
import { TrendChart } from "@/components/analytics/TrendChart";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { SourceChart } from "@/components/analytics/SourceChart";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatCurrency, calculatePercentageChange } from "@/lib/utils";
import { useT } from "@/contexts/LanguageContext";

export default function AnalyticsPage() {
  const t = useT();
  const { data, isLoading } = trpc.analytics.getDashboard.useQuery({});

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { thisWeek, lastWeek, bySource } = data;
  const bookingChange = calculatePercentageChange(thisWeek.bookings, lastWeek.bookings);
  const revenueChange = calculatePercentageChange(thisWeek.revenue, lastWeek.revenue);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t("analytics.title")}</h1>
        <p className="text-gray-600 text-xs md:text-sm">{t("analytics.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title={t("analytics.bookings_week")} value={thisWeek.bookings} change={bookingChange} icon="calendar" />
        <StatsCard title={t("analytics.revenue_week")} value={formatCurrency(thisWeek.revenue)} change={revenueChange} icon="dollar" />
        <StatsCard title={t("analytics.confirmation_rate")} value={`${thisWeek.confirmationRate.toFixed(1)}%`} icon="check" />
        <StatsCard title={t("analytics.attendance_rate")} value={`${thisWeek.attendanceRate.toFixed(1)}%`} icon="user-check" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <TrendChart />
        <SourceChart data={bySource} />
      </div>

      <RevenueChart />

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{t("analytics.weekly_summary")}</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { key: "analytics.total_bookings", value: thisWeek.bookings },
            { key: "analytics.confirmed", value: thisWeek.confirmed },
            { key: "analytics.attended", value: thisWeek.attended },
            { key: "analytics.no_shows", value: thisWeek.noShows },
            { key: "analytics.revenue_generated", value: formatCurrency(thisWeek.revenue) },
            { key: "analytics.confirmation_rate", value: `${thisWeek.confirmationRate.toFixed(1)}%` },
            { key: "analytics.attendance_rate", value: `${thisWeek.attendanceRate.toFixed(1)}%` },
          ].map((row) => (
            <div key={row.key} className="flex justify-between px-4 md:px-6 py-3 text-sm">
              <span className="text-gray-600">{t(row.key)}</span>
              <span className="font-semibold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
