"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, CheckCircle,
  BarChart3, Settings, Building2, Stethoscope, X,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { useSidebar } from "./SidebarContext";
import { useT } from "@/contexts/LanguageContext";

type NavItem = {
  key: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
};

const NAV_ITEMS: NavItem[] = [
  { key: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ALL"] },
  { key: "nav.patients", href: "/patients", icon: Users, roles: ["CLINIC_OWNER", "CLINIC_STAFF", "DOCTOR"] },
  { key: "nav.appointments", href: "/appointments", icon: Calendar, roles: ["CLINIC_OWNER", "CLINIC_STAFF", "DOCTOR"] },
  { key: "nav.confirmations", href: "/confirmations", icon: CheckCircle, roles: ["CONFIRMATION_AGENT", "SUPER_ADMIN"] },
  { key: "nav.analytics", href: "/analytics", icon: BarChart3, roles: ["CLINIC_OWNER", "SUPER_ADMIN"] },
  { key: "nav.settings", href: "/settings", icon: Settings, roles: ["CLINIC_OWNER"] },
  { key: "nav.admin", href: "/admin", icon: Building2, roles: ["SUPER_ADMIN"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { open, setOpen } = useSidebar();
  const t = useT();

  const filtered = NAV_ITEMS.filter(
    (item) => item.roles.includes("ALL") || item.roles.includes(user?.role || "")
  );

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200",
          "transform transition-transform duration-300 ease-in-out",
          "md:static md:translate-x-0 md:transition-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Clinomatic</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filtered.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-teal-600" : "text-gray-400"
                  )}
                />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
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
    </>
  );
}
