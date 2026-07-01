import { useCallback, useMemo, useState } from "react";

/**
 * Generic selection state for bulk actions on a list of records.
 * Keeps only IDs that are still present in `eligibleIds` whenever the list refreshes.
 */
export function useTxnSelection(eligibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const eligibleSet = useMemo(() => new Set(eligibleIds), [eligibleIds]);

  // Drop IDs that are no longer eligible (e.g. status changed after refresh).
  const cleanSelected = useMemo(() => {
    const out = new Set<string>();
    selected.forEach(id => { if (eligibleSet.has(id)) out.add(id); });
    return out;
  }, [selected, eligibleSet]);

  const toggle = useCallback((id: string) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(s => {
      if (eligibleIds.every(id => s.has(id)) && eligibleIds.length > 0) return new Set();
      return new Set(eligibleIds);
    });
  }, [eligibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => cleanSelected.has(id), [cleanSelected]);

  const allSelected = eligibleIds.length > 0 && eligibleIds.every(id => cleanSelected.has(id));

  return {
    selected: cleanSelected,
    selectedIds: Array.from(cleanSelected),
    count: cleanSelected.size,
    isSelected, toggle, toggleAll, clear, allSelected,
  };
}