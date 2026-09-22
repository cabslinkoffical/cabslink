/**
 * Tick-box selection state for admin lists, shared by every table that offers
 * bulk actions (activate / pause / delete).
 */
import { useCallback, useMemo, useState } from "react";

export function useRowSelection(allIds: string[]) {
  const [selected, setSelected] = useState<string[]>([]);

  const present = useMemo(() => new Set(allIds), [allIds]);
  // Rows removed from the list (deleted, filtered) must drop out of the selection.
  const ids = useMemo(() => selected.filter((id) => present.has(id)), [selected, present]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const allSelected = allIds.length > 0 && ids.length === allIds.length;

  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.length >= allIds.length ? [] : [...allIds]));
  }, [allIds]);

  return {
    ids,
    count: ids.length,
    isSelected: (id: string) => ids.includes(id),
    toggle,
    toggleAll,
    allSelected,
    clear,
  };
}
