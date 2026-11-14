import { Link } from "@tanstack/react-router";
import { ArrowRight, Search, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type TourSearchControls = {
  q: string;
  onQ: (value: string) => void;
  theme: string;
  onTheme: (value: string) => void;
  length: string;
  onLength: (value: string) => void;
  onReset: () => void;
  themes: string[];
  resultCount: number;
  totalCount: number;
};

/** The full itinerary editor lives in /book/tour, not inside the catalogue. */
export function CustomTourBuilder({ search }: { search?: TourSearchControls }) {
  if (!search) return (
    <Button asChild variant="navy"><Link to="/book/tour"><Wand2 />Build a custom tour</Link></Button>
  );
  const filtering = Boolean(search.q.trim() || search.theme || search.length);
  return (
    <div className="border-y border-border py-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-2xl font-semibold">Find your tour</h2>
        <Button asChild variant="navy" className="h-11 shrink-0 self-start sm:self-auto">
          <Link to="/book/tour"><Wand2 />Build a custom tour<ArrowRight /></Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_minmax(180px,240px)]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="tour-search">Search tours</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="tour-search" type="search" maxLength={80} value={search.q}
              onChange={(event) => search.onQ(event.target.value)}
              placeholder="Tour name, place or theme" className="h-12 pl-10 pr-12 text-base [&::-webkit-search-cancel-button]:appearance-none" />
            {search.q && <Button type="button" size="icon" variant="ghost" aria-label="Clear tour search"
              className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => search.onQ("")}><X /></Button>}
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="tour-theme">Theme</Label>
          <Select value={search.theme || "__all__"} onValueChange={(value) => search.onTheme(value === "__all__" ? "" : value)}>
            <SelectTrigger id="tour-theme" className="h-12 bg-background text-base"><SelectValue placeholder="All themes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All themes</SelectItem>
              {search.themes.map((theme) => <SelectItem key={theme} value={theme}>{theme.replace(/[-_]/g, " ")}</SelectItem>)}
              {search.theme && !search.themes.includes(search.theme) && <SelectItem value={search.theme}>{search.theme.replace(/[-_]/g, " ")}</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="tour-length">Tour length</Label>
          <Select value={search.length || "__all__"} onValueChange={(value) => search.onLength(value === "__all__" ? "" : value)}>
            <SelectTrigger id="tour-length" className="h-12 bg-background text-base"><SelectValue placeholder="Any length" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Any length</SelectItem>
              <SelectItem value="half">Half day (up to 6 hours)</SelectItem>
              <SelectItem value="full">Full day (7–10 hours)</SelectItem>
              <SelectItem value="long">Long day &amp; multi-region</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex min-h-10 flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {filtering ? `${search.resultCount} of ${search.totalCount} tours` : `${search.totalCount} tours available`}
        </p>
        {filtering && <Button type="button" variant="ghost" size="sm" onClick={search.onReset}><X />Clear filters</Button>}
      </div>
    </div>
  );
}
