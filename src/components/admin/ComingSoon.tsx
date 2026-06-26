import { Construction } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";

export function ComingSoon({ title, description, features }: { title: string; description: string; features: string[] }) {
  return (
    <div className="p-6 md:p-8">
      <PageHeader title={title} description={description} />
      <div className="border border-dashed border-border rounded-xl bg-card p-10 text-center max-w-2xl mx-auto">
        <div className="size-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center"><Construction className="size-7" /></div>
        <h2 className="text-lg font-semibold mt-4">Phase 2 module</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">This module is scaffolded and will be wired up in the next build phase.</p>
        <div className="text-left max-w-md mx-auto">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Planned features</p>
          <ul className="space-y-1.5">
            {features.map(f => <li key={f} className="text-sm flex gap-2"><span className="text-primary">•</span>{f}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
