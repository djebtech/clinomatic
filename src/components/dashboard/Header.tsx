"use client";

import { Bell, LogOut, Globe, Menu, Check } from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarContext";
import { useLanguage, type Lang } from "@/contexts/LanguageContext";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const LANGS: { code: Lang; flag: string; label: string; native: string }[] = [
  { code: "fr", flag: "🇩🇿", label: "Français", native: "Français" },
  { code: "ar", flag: "🇸🇦", label: "Arabic", native: "العربية" },
  { code: "en", flag: "🇬🇧", label: "English", native: "English" },
];

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        title="Language / اللغة"
        className="h-8 w-8"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 overflow-hidden">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors",
                lang === l.code ? "text-teal-700 font-medium bg-teal-50" : "text-gray-700"
              )}
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-left">{l.native}</span>
              {lang === l.code && <Check className="h-3.5 w-3.5 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { toggle } = useSidebar();
  const { lang } = useLanguage();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const dateLocale = lang === "ar" ? "ar-DZ" : lang === "en" ? "en-GB" : "fr-DZ";

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

        {/* Date */}
        <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">
          <span className="sm:hidden">
            {new Date().toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
          </span>
          <span className="hidden sm:inline">
            {new Date().toLocaleDateString(dateLocale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <LanguageSwitcher />

        {/* Notifications */}
        <Button variant="ghost" size="icon" title="Notifications" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User avatar — hidden on mobile */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-2">
            <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs">
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
          <span className="hidden sm:inline text-xs text-gray-600">
            {lang === "ar" ? "خروج" : lang === "en" ? "Sign out" : "Déconnexion"}
          </span>
        </Button>
      </div>
    </header>
  );
}
