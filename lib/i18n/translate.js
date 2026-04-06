import { en, de } from "@/lib/i18n/dictionaries";

export const LOCALES = /** @type {const} */ (["en", "de"]);
export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "bookflow.locale";

const dictionaries = { en, de };

export function getDictionary(locale) {
  const L = locale === "de" ? "de" : "en";
  return dictionaries[L];
}

/** @param {Record<string, string>} dict */
export function translate(dict, key, vars) {
  let s = dict[key] ?? key;
  if (vars && typeof vars === "object") {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return s;
}
