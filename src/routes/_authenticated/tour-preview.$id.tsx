/**
 * Staff-only preview of a tour page (draft or live), rendered with the same
 * page body customers see. The data comes from an admin-checked server
 * function, so a draft is never visible to the public.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { TourDetailView } from "@/components/site/TourDetailView";
import { getTourPreview } from "@/lib/tour-admin-tools.functions";

export const Route = createFileRoute("/_authenticated/tour-preview/$id")({
  head: () => ({
    meta: [
      { title: "Tour preview — Cabslink staff" },
      { name: "description", content: "Staff preview of a Cabslink tour page." },
      { property: "og:title", content: "Tour preview — Cabslink staff" },
      { property: "og:description", content: "Staff preview of a Cabslink tour page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TourPreviewPage,
});

function TourPreviewPage() {
  const { id } = Route.useParams();
  const fetchPreview = useServerFn(getTourPreview);
  const q = useQuery({ queryKey: ["admin", "tour-preview", id], queryFn: () => fetchPreview({ data: { id } }), staleTime: 0 });

  if (q.isLoading) {
    return <p className="flex items-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading preview…</p>;
  }
  if (q.isError || !q.data) {
    return (
      <div className="p-10 text-sm">
        <p className="font-semibold text-destructive">{(q.error as Error)?.message ?? "Couldn't load this preview."}</p>
        <Link to="/cabs-booking-pannel/scenic-routes" className="mt-3 inline-block underline">Back to tours</Link>
      </div>
    );
  }
  return <TourDetailView d={q.data.detail} slug={q.data.detail.slug} preview={{ live: q.data.live }} />;
}
