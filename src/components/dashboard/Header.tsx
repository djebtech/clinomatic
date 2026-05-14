"use client";

import { Bell, LogOut, Globe } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user } = useCurrentUser();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 h-14">
      <div>
        <h2 className="text-sm text-gray-500">
          {new Date().toLocaleDateString("fr-DZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Language toggle placeholder */}
        <Button variant="ghost" size="icon" title="Langue / اللغة">
          <Globe className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Sign out */}
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}
