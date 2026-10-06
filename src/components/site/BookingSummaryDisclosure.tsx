import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Edit3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookingSummaryDisclosure({ children, onEdit }: { children: ReactNode; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="lg:hidden flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" className="px-0" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((value) => !value)}>
          <MapPin className="size-4 text-primary" /> Trip summary
          <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Edit3 className="size-3.5" /> Edit booking
        </Button>
      </div>
      <div id={contentId} className={expanded ? "block" : "hidden lg:block"}>
        {children}
      </div>
    </div>
  );
}