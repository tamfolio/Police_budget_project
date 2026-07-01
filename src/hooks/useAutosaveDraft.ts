import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persist a long form's in-progress values to localStorage so a page refresh
 * does not lose work. Keyed per user + form so different clerks don't collide.
 *
 * Usage:
 *   const [values, setValues, draft] = useAutosaveDraft("aie-entry", initial, { userId });
 *   ...
 *   {draft.restored && <DraftBanner savedAt={draft.savedAt} onDiscard={draft.discard} />}
 *   // call draft.clear() after a successful submit
 */
export function useAutosaveDraft<T extends Record<string, unknown>>(
  formKey: string,
  initial: T,
  opts?: { userId?: string | null; debounceMs?: number },
) {
  const storageKey = `npf:draft:${opts?.userId ?? "anon"}:${formKey}`;
  const debounceMs = opts?.debounceMs ?? 500;

  const [values, setValuesRaw] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.values) return { ...initial, ...parsed.values } as T;
    } catch {}
    return initial;
  });
  const [restored, setRestored] = useState<boolean>(() => {
    try { return !!localStorage.getItem(storageKey); } catch { return false; }
  });
  const [savedAt, setSavedAt] = useState<number | null>(() => {
    try { const raw = localStorage.getItem(storageKey); return raw ? (JSON.parse(raw).savedAt ?? null) : null; } catch { return null; }
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const persist = useCallback((v: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const at = Date.now();
        localStorage.setItem(storageKey, JSON.stringify({ values: v, savedAt: at }));
        setSavedAt(at);
      } catch { /* quota/private-mode etc. */ }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  const setValues: typeof setValuesRaw = useCallback((next) => {
    setValuesRaw(prev => {
      const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      persist(v);
      return v;
    });
  }, [persist]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    setRestored(false);
    setSavedAt(null);
  }, [storageKey]);

  const discard = useCallback(() => {
    clear();
    setValuesRaw(initial);
  }, [clear, initial]);

  return [values, setValues, { restored, savedAt, clear, discard }] as const;
}