"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, CheckCircle,
  BarChart3, Settings, Building2, UserCog, Stethoscope,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Tableau de bord", nameAr: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, roles: ["ALL"] },
  { name: "Patients", nameAr: "المرضى", href: "/patients", icon: Users, roles: ["CLINIC_OWNER", "CLINIC_STAFF", "DOCTOR"] },
  { name: "Rendez-vous", nameAr: "المواعيد", href: "/appointments", icon: Calendar, roles: ["CLINIC_OWNER", "CLINIC_STAFF", "DOCTOR"] },
  { name: "Confirmations", nameAr: "التأكيدات", href: "/confirmations", icon: CheckCircle, roles: ["CONFIRMATION_AGENT", "SUPER_ADMIN"] },
  { name: "Analytique", nameAr: "التحليلات", href: "/analytics", icon: BarChart3, roles: ["CLINIC_OWNER", "SUPER_ADMIN"] },
  { name: "Paramètres", nameAr: "الإعدادات", href: "/settings", icon: Settings, roles: ["CLINIC_OWNER"] },
  { name: "Admin", nameAr: "الإدارة", href: "/admin", icon: Building2, roles: ["SUPER_ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  const filtered = navigation.filter(
    (item) => item.roles.includes("ALL") || item.roles.includes(user?.role || "")
  );

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <Stethoscope className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Clinomatic</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filtered.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-teal-50 text-teal-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-teal-600" : "text-gray-400")} />
              <span>{item.name}</span>
              {item.nameAr && (
                <span className="ml-auto text-xs text-gray-400 font-normal" dir="rtl">
                  {item.nameAr}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
