"use client";

import { Bell, LogOut, Globe, Menu } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";

export function Header() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { toggle } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="flex items-center justify-between px-3 sm:px-6 py-3 bg-white border-b border-gray-200 h-14 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="md:hidden h-8 w-8"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Date — short on mobile, full on desktop */}
        <p className="text-xs sm:text-sm text-gray-500 hidden xs:block">
          <span className="sm:hidden">
            {new Date().toLocaleDateString("fr-DZ", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="hidden sm:inline">
            {new Date().toLocaleDateString("fr-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-2">
        {/* Language toggle */}
        <Button variant="ghost" size="icon" title="Langue / اللغة" className="h-8 w-8">
          <Globe className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" title="Notifications" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User avatar — hidden on mobile */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-2">
            <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 max-w-[120px] truncate hidden lg:block">
              {user.name}
            </span>
          </div>
        )}

        {/* Sign out */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-1 sm:gap-2 h-8 px-2 sm:px-3"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
