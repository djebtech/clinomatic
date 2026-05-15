"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import ar from "../../messages/ar.json";

export type Lang = "en" | "fr" | "ar";

type Messages = typeof en;

const messages: Record<Lang, Messages> = { en, fr, ar };

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "fr",
  setLang: () => {},
  t: (k) => k,
  dir: "ltr",
});

function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path; // key not found — return raw key
    }
  }
  return typeof cur === "string" ? cur : path;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("clinomatic_lang") as Lang | null;
    if (stored && ["en", "fr", "ar"].includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("clinomatic_lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = resolve(messages[lang] as unknown as Record<string, unknown>, key);
      // Fallback to English if key not found in current language
      if (raw === key && lang !== "en") {
        const fallback = resolve(messages.en as unknown as Record<string, unknown>, key);
        return interpolate(fallback, vars);
      }
      return interpolate(raw, vars);
    },
    [lang]
  );

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  // Apply RTL to document
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

/** Shorthand hook — just returns t() */
export const useT = () => useContext(LanguageContext).t;
