import { LOCALES, useLocale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const [locale, setLocale] = useLocale();
  return (
    <label className="inline-flex items-center gap-1 h-8 px-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground" title="Interface language">
      <Globe className="h-4 w-4" />
      <select
        aria-label="Interface language"
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        className="bg-transparent text-[11px] uppercase tracking-wide focus:outline-none cursor-pointer"
      >
        {LOCALES.map(l => (
          <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
        ))}
      </select>
    </label>
  );
}