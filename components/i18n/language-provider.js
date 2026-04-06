"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getDictionary,
  translate as translateKey
} from "@/lib/i18n/translate";

const LanguageContext = createContext(null);

function readStoredLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (v === "de" || v === "en") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLocaleState(readStoredLocale());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "de" ? "de" : "en";
    }
  }, [locale, ready]);

  const setLocale = useCallback((next) => {
    if (next === "de" || next === "en") setLocaleState(next);
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const t = useCallback((key, vars) => translateKey(dict, key, vars), [dict]);

  const value = useMemo(() => ({ locale, setLocale, t, ready }), [locale, setLocale, t, ready]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    const fallback = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key, vars) => translateKey(fallback, key, vars),
      ready: true
    };
  }
  return ctx;
}
