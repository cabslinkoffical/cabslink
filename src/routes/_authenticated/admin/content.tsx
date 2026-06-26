import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/admin/ComingSoon";
export const Route = createFileRoute("/_authenticated/admin/content")({ component: () => <ComingSoon title="Website Content" description="Manage public website pages, SEO, FAQs, testimonials, and blog." features={["Homepage hero & section copy", "Service / airport / fleet pages", "SEO titles, descriptions, keywords", "FAQ & testimonials management", "Blog posts & image uploads"]} /> });
