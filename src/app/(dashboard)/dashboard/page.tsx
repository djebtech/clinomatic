"use client";

import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TrendChart } from "@/components/analytics/TrendChart";
import { SourceChart } from "@/components/analytics/SourceChart";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/appointments/StatusBadge";
import { formatCurrency, formatDateTime, calculatePercentageChange } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { useT } from "@/contexts/LanguageContext";

export default function DashboardPage() {
  const t = useT();
  const { data, isLoading } = trpc.analytics.getDashboard.useQuery({});
  const { data: today } = trpc.appointment.todaySummary.useQuery();

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { thisWeek, lastWeek, bySource, topServices } = data;
  const bookingChange = calculatePercentageChange(thisWeek.bookings, lastWeek.bookings);
  const revenueChange = calculatePercentageChange(thisWeek.revenue, lastWeek.revenue);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
          <p className="text-gray-600 text-xs md:text-sm mt-0.5">{t("dashboard.subtitle")}</p>
        </div>
        <Button asChild size="sm" className="self-start sm:self-auto">
          <Link href="/appointments/new">
            <CalendarPlus className="h-4 w-4" />
            <span className="ml-1">{t("dashboard.new_appointment")}</span>
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard title={t("dashboard.bookings")} value={thisWeek.bookings} change={bookingChange} icon="calendar" />
        <StatsCard
          title={t("dashboard.confirmed")}
          value={thisWeek.confirmed}
          subtitle={t("dashboard.confirmation_rate", { rate: thisWeek.confirmationRate.toFixed(1) })}
          icon="check"
        />
        <StatsCard
          title={t("dashboard.attended")}
          value={thisWeek.attended}
          subtitle={t("dashboard.attendance_rate", { rate: thisWeek.attendanceRate.toFixed(1) })}
          icon="user-check"
        />
        <StatsCard
          title={t("dashboard.revenue")}
          value={formatCurrency(thisWeek.revenue)}
          change={revenueChange}
          icon="dollar"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <TrendChart />
        <SourceChart data={bySource} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">
              {t("dashboard.today_appointments")} ({today?.total ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {today?.appointments.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">{t("dashboard.no_appointments_today")}</p>
            ) : (
              <div className="space-y-2">
                {today?.appointments.slice(0, 6).map((apt) => (
                  <Link
                    key={apt.id}
                    href={`/appointments/${apt.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 text-center flex-shrink-0">
                      <span className="text-xs font-bold text-teal-600">
                        {new Date(apt.date).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{apt.patient.name}</p>
                      <p className="text-xs text-gray-600 truncate">{apt.service.name}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </Link>
                ))}
                {(today?.total ?? 0) > 6 && (
                  <Link href="/appointments" className="block text-center text-sm text-teal-600 hover:underline pt-2">
                    {t("dashboard.view_all", { count: String(today?.total) })}
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">
              {t("dashboard.top_services")} — {t("dashboard.this_week")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((ts, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ts.service?.name}</p>
                      <p className="text-xs text-gray-600">{ts._count.id} {t("dashboard.bookings").toLowerCase()}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 flex-shrink-0 ml-2">
                    {formatCurrency(ts._sum.price || 0)}
                  </p>
                </div>
              ))}
              {topServices.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">{t("dashboard.no_data_week")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
