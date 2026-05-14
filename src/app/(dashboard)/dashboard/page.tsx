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

export default function DashboardPage() {
  const { data, isLoading } = trpc.analytics.getDashboard.useQuery({});
  const { data: today } = trpc.appointment.todaySummary.useQuery();

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { thisWeek, lastWeek, bySource, topServices } = data;
  const bookingChange = calculatePercentageChange(thisWeek.bookings, lastWeek.bookings);
  const revenueChange = calculatePercentageChange(thisWeek.revenue, lastWeek.revenue);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 text-sm mt-0.5">لوحة التحكم — aperçu de la semaine</p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <CalendarPlus className="h-4 w-4" />
            Nouveau rendez-vous
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Réservations" value={thisWeek.bookings} change={bookingChange} icon="calendar" />
        <StatsCard
          title="Confirmés"
          value={thisWeek.confirmed}
          subtitle={`${thisWeek.confirmationRate.toFixed(1)}% taux`}
          icon="check"
        />
        <StatsCard
          title="Présents"
          value={thisWeek.attended}
          subtitle={`${thisWeek.attendanceRate.toFixed(1)}% présence`}
          icon="user-check"
        />
        <StatsCard
          title="Revenus"
          value={formatCurrency(thisWeek.revenue)}
          change={revenueChange}
          icon="dollar"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart />
        <SourceChart data={bySource} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Rendez-vous aujourd&apos;hui ({today?.total ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {today?.appointments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Aucun rendez-vous aujourd&apos;hui</p>
            ) : (
              <div className="space-y-3">
                {today?.appointments.slice(0, 6).map((apt) => (
                  <Link key={apt.id} href={`/appointments/${apt.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-14 text-center">
                      <span className="text-xs font-bold text-teal-600">
                        {new Date(apt.date).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{apt.patient.name}</p>
                      <p className="text-xs text-gray-500">{apt.service.name}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </Link>
                ))}
                {(today?.total ?? 0) > 6 && (
                  <Link href="/appointments" className="block text-center text-sm text-teal-600 hover:underline pt-2">
                    Voir tous ({today?.total})
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top services */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services (cette semaine)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((ts, idx) => (
                <div key={idx} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{ts.service?.name}</p>
                      <p className="text-xs text-gray-500">{ts._count.id} réservations</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(ts._sum.price || 0)}
                  </p>
                </div>
              ))}
              {topServices.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">Aucune donnée cette semaine</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
