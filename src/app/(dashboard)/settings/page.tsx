"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import Link from "next/link";
import { Stethoscope, Settings2, MessageCircle, Globe2, ArrowRight } from "lucide-react";

const settingsItems = [
  { href: "/settings/services", icon: Settings2, title: "Services", titleAr: "الخدمات", description: "Gérer vos services et tarifs" },
  { href: "/settings/doctors", icon: Stethoscope, title: "Médecins", titleAr: "الأطباء", description: "Gérer l'équipe médicale" },
  { href: "/settings/whatsapp", icon: MessageCircle, title: "WhatsApp", titleAr: "واتساب", description: "Configuration de l'automatisation" },
  { href: "/settings/integrations", icon: Globe2, title: "Intégrations", titleAr: "التكاملات", description: "Instagram, Facebook, réseaux sociaux" },
];

export default function SettingsPage() {
  const { data: clinic, isLoading } = trpc.clinic.getCurrent.useQuery();

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm">الإعدادات — {clinic?.name}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations de la clinique</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Nom</span><span className="font-medium">{clinic?.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Téléphone</span><span className="font-medium">{clinic?.phone}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Ville</span><span className="font-medium">{clinic?.city || "—"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Abonnement</span><span className="font-medium">{clinic?.subscriptionPlan}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Patients</span><span className="font-medium">{clinic?._count.patients}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Médecins</span><span className="font-medium">{clinic?._count.doctors}</span></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:shadow-md hover:border-teal-300 transition-all cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.titleAr} — {item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
