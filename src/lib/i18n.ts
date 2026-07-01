// Lightweight i18n. No external deps. Wraps strings for future Hausa/Yoruba/Igbo
// translation. English is the source of truth; missing keys fall back to the key
// itself or an inline default.
import { useSyncExternalStore } from "react";

export type Locale = "en" | "ha" | "yo" | "ig";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English",  native: "English" },
  { code: "ha", label: "Hausa",    native: "Hausa" },
  { code: "yo", label: "Yoruba",   native: "Yorùbá" },
  { code: "ig", label: "Igbo",     native: "Igbo" },
];

// Translation tables. Add keys as they're wrapped in components.
// Stubs for ha/yo/ig fall back to English until translators provide values.
type Dict = Record<string, string>;
const en: Dict = {
  "app.title": "Nigeria Police Force · Budget and Accounting Digital System",
  "nav.dashboard": "Dashboard",
  "nav.inflows": "Fund Inflows",
  "nav.aie": "AIE Records",
  "nav.distributions": "Distributions",
  "nav.expenditures": "Expenditures",
  "nav.reports": "Reports",
  "common.search": "Search…",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.loading": "Loading…",
  "shortcuts.help.title": "Keyboard shortcuts",
  "shortcuts.help.openPalette": "Open command palette",
  "shortcuts.help.help": "Show this help",
  "draft.restored": "Draft restored from {when}",
  "draft.discard": "Discard draft",
};
const stubs: Record<Exclude<Locale, "en">, Dict> = { ha: {}, yo: {}, ig: {} };
const TABLES: Record<Locale, Dict> = { en, ha: stubs.ha, yo: stubs.yo, ig: stubs.ig };

const STORAGE_KEY = "npf:locale";
let current: Locale = (() => {
  try { const v = localStorage.getItem(STORAGE_KEY); if (v && ["en","ha","yo","ig"].includes(v)) return v as Locale; } catch {}
  return "en";
})();
const listeners = new Set<() => void>();

export function getLocale(): Locale { return current; }
export function setLocale(l: Locale) {
  current = l;
  try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  document.documentElement.setAttribute("lang", l);
  listeners.forEach(fn => fn());
}
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function t(key: string, vars?: Record<string, string | number>, fallback?: string) {
  const table = TABLES[current] ?? en;
  let s = table[key] ?? en[key] ?? fallback ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  return s;
}

export function useLocale(): [Locale, (l: Locale) => void] {
  const value = useSyncExternalStore(subscribe, () => current, () => current);
  return [value, setLocale];
}

// Initialise <html lang> on first import
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("lang", current);
}