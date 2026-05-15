"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import { Stethoscope, Settings2, MessageCircle, Globe2, ArrowRight } from "lucide-react";
import { useT } from "@/contexts/LanguageContext";

export default function SettingsPage() {
  const t = useT();
  const { data: clinic, isLoading } = trpc.clinic.getCurrent.useQuery();

  if (isLoading) return <PageLoader />;

  const settingsItems = [
    { href: "/settings/services", icon: Settings2, title: t("settings.services"), description: t("common.filter") },
    { href: "/settings/doctors", icon: Stethoscope, title: t("settings.doctors"), description: t("common.filter") },
    { href: "/settings/whatsapp", icon: MessageCircle, title: t("settings.whatsapp"), description: t("common.settings") },
    { href: "/settings/integrations", icon: Globe2, title: t("settings.integrations"), description: "Instagram, Facebook" },
  ];

  return (
    <div className="max-w-2xl space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{t("settings.title")}</h1>
        <p className="text-gray-600 text-xs md:text-sm">{clinic?.name}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.clinic_info")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { label: t("common.name"), value: clinic?.name },
            { label: t("common.phone"), value: clinic?.phone },
            { label: t("common.city"), value: clinic?.city || "—" },
            { label: t("clinics.plan"), value: clinic?.subscriptionPlan },
            { label: t("patients.title"), value: clinic?._count.patients },
            { label: t("settings.doctors"), value: clinic?._count.doctors },
          ].map((row) => (
            <div key={row.label} className="flex justify-between py-0.5">
              <span className="text-gray-600">{row.label}</span>
              <span className="font-medium text-gray-900">{row.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md hover:border-teal-300 transition-all cursor-pointer h-full">
              <CardContent className="p-4 md:p-5 flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-600 truncate">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
