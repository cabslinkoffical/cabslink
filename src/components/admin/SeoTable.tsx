import { useMemo, useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/** Row-selection state for bulk actions on any admin list. */
export function useBulkSelection<T extends { id: string }>(rows: T[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const visible = useMemo(() => selected.filter((id) => ids.includes(id)), [selected, ids]);
  return {
    selected: visible,
    setSelected,
    clear: () => setSelected([]),
    toggle: (id: string) =>
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    toggleAll: () => setSelected((prev) => (prev.length >= ids.length ? [] : ids)),
    allSelected: ids.length > 0 && visible.length === ids.length,
  };
}

type Col<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function SeoTable<T extends { id: string }>({
  rows, cols, onEdit, onDelete, selection,
}: {
  rows: T[];
  cols: Col<T>[];
  onEdit: (row: T) => void;
  onDelete: (id: string) => void;
  /** Pass the value from `useBulkSelection(rows)` to enable tick boxes. */
  selection?: ReturnType<typeof useBulkSelection<T>>;
}) {
  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No records yet.</div>;
  }
  return (
    <div className="admin-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {selection && (
                <th className="w-10 px-3 py-2 text-left">
                  <Checkbox aria-label="Select all rows" checked={selection.allSelected} onCheckedChange={() => selection.toggleAll()} />
                </th>
              )}
              {cols.map(c => <th key={String(c.key)} className={"px-3 py-2 text-left font-medium " + (c.className ?? "")}>{c.header}</th>)}
              <th className="px-3 py-2 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={"border-t border-border " + (selection?.selected.includes(r.id) ? "bg-primary/[0.05]" : "")}>
                {selection && (
                  <td className="px-3 py-2 align-top">
                    <Checkbox aria-label="Select row" checked={selection.selected.includes(r.id)} onCheckedChange={() => selection.toggle(r.id)} />
                  </td>
                )}
                {cols.map(c => (
                  <td key={String(c.key)} className={"px-3 py-2 align-top " + (c.className ?? "")}>
                    {c.render ? c.render(r) : String((r as any)[c.key] ?? "")}
                  </td>
                ))}
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(r)} aria-label="Edit"><Edit className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} aria-label="Delete"><Trash2 className="size-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PublishedPill({ on }: { on: boolean }) {
  return <span className={"inline-block px-2 py-0.5 rounded-full text-[11px] font-medium " + (on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>{on ? "Live" : "Draft"}</span>;
}
