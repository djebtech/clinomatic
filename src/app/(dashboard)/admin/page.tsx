"use client";

import { trpc } from "@/lib/trpc";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Building2, Users, Calendar, UserCog } from "lucide-react";
import { useT } from "@/contexts/LanguageContext";

export default function AdminPage() {
  const t = useT();
  const { data, isLoading } = trpc.admin.getOverview.useQuery();

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("nav.admin")}</h1>
        <p className="text-gray-600 text-sm">{t("common.dashboard")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-teal-600" />
              <div>
                <p className="text-2xl font-bold">{data.totalClinics}</p>
                <p className="text-sm text-gray-600">{t("clinics.active_count")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{data.totalPatients}</p>
                <p className="text-sm text-gray-600">{t("patients.total")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{data.totalAppointments}</p>
                <p className="text-sm text-gray-600">{t("analytics.total_bookings")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <UserCog className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{data.activeAgents}</p>
                <p className="text-sm text-gray-600">{t("common.active")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t("clinics.list")}
              <Link href="/admin/clinics" className="text-sm text-teal-600 hover:underline font-normal">
                {t("dashboard.view_all", { count: "" })}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentClinics.map((clinic) => (
                <div key={clinic.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-sm">{clinic.name}</p>
                    <p className="text-xs text-gray-600">{clinic.city} — {formatDate(clinic.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={clinic.isActive ? "success" : "secondary"}>
                      {clinic.isActive ? t("common.active") : t("common.inactive")}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{clinic._count.patients} {t("patients.title").toLowerCase()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("appointments.status.PENDING")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-3xl font-bold text-orange-500">{data.pendingConfirmations}</p>
              <p className="text-gray-600 text-sm mt-1">{t("nav.confirmations")}</p>
              <Link href="/confirmations" className="text-teal-600 text-sm hover:underline mt-3 block">
                →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
