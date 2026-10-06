import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { resolvePublicRedirect } from "../lib/seo-public.functions";
import { getSiteStatus } from "../lib/site-status.functions";
import { DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "../lib/seo/page-head";
import { createTtlCache, followRedirects } from "../lib/seo/redirect-resolver";
import { MaintenanceScreen } from "../components/site/MaintenanceScreen";
import { ConsentBanner } from "../components/site/ConsentBanner";
import { initAnalytics, isMeasurablePath, trackPageView } from "../lib/analytics-ga";
import { installStaleCacheRecovery } from "../lib/stale-cache-recovery";
import { ownPageView, refreshOwnConsent } from "../lib/own-analytics";
import { onConsentChange } from "../lib/consent";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-semibold text-[var(--gold)]">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-6 py-2.5 text-sm font-medium">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or go back home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-full bg-[var(--gold)] text-[var(--gold-foreground)] px-5 py-2 text-sm font-medium">Try again</button>
          <a href="/" className="rounded-full border px-5 py-2 text-sm font-medium">Go home</a>
        </div>
      </div>
    </div>
  );
}

/**
 * Legacy PHP URLs from the previous site. Googlebot still crawls these, so they
 * must answer with a real server-side 301 (not a client navigation) to carry
 * ranking signals over. Keys are lowercase, query strings are ignored.
 */
const LEGACY_PHP_REDIRECTS: Record<string, string> = {
  "/index.php": "/",
  "/about-us.php": "/about",
  "/fleet.php": "/fleet",
  "/contact-us.php": "/contact",
  "/get-a-quote.php": "/get-a-quote",
  "/services.php": "/services",
};

type SiteStatusValue = { maintenance: boolean; company_name: string | null };
const OPEN_SITE: SiteStatusValue = { maintenance: false, company_name: null };
const statusCache = createTtlCache<SiteStatusValue>(30_000);
const redirectCache = createTtlCache<{ to: string; code: 301 | 302 } | null>(5 * 60_000);

async function cachedSiteStatus(): Promise<SiteStatusValue> {
  const hit = statusCache.get("status");
  if (hit) return hit;
  const value = await getSiteStatus().catch(() => OPEN_SITE);
  statusCache.set("status", value);
  return value;
}

async function resolveRedirectTarget(path: string) {
  const hit = redirectCache.get(path);
  if (hit !== undefined) return hit;
  try {
    const value = await followRedirects(path, (from) => resolvePublicRedirect({ data: { path: from } }));
    redirectCache.set(path, value);
    return value;
  } catch {
    // Swallow lookup errors so the site keeps loading.
    return null;
  }
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    const p = location.pathname;

    // Must run before anything else: the catch-all `/$` route otherwise owns
    // these paths and would answer 404.
    const legacy = LEGACY_PHP_REDIRECTS[p.toLowerCase().replace(/\/+$/, "") || "/"];
    if (legacy) throw redirect({ href: legacy, statusCode: 301 });

    // Admin, auth and API stay reachable so the switch can be turned back off.
    const isExempt = !p || p.startsWith("/api/") || p.startsWith("/cabs-booking-pannel") ||
      p.startsWith("/auth") || p.startsWith("/_") || /\.[a-z0-9]{2,5}$/i.test(p);


    // Maintenance flag and redirect lookup run in parallel; both are cached.
    const [maintenance, target] = await Promise.all([
      isExempt ? Promise.resolve(OPEN_SITE) : cachedSiteStatus(),
      isExempt || p === "/" ? Promise.resolve(null) : resolveRedirectTarget(p),
    ]);
    if (maintenance.maintenance) return { maintenance };
    if (target) throw redirect({ href: target.to, statusCode: target.code });
    return { maintenance };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESCRIPTION },
      { name: "author", content: "Cabslink" },
      { name: "theme-color", content: "#0e182c" },
      { property: "og:site_name", content: "Cabslink" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <head><HeadContent /></head>
      <body suppressHydrationWarning>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const ctx = Route.useRouteContext() as { queryClient: QueryClient; maintenance?: { maintenance: boolean; company_name: string | null } };
  const pathname = useRouterState({ select: s => s.location.pathname });
  const measurable = isMeasurablePath(pathname);

  // Clear leftover background caches from older visits in long-lived profiles.
  useEffect(() => { installStaleCacheRecovery(); }, []);

  // Analytics: install once (consent-gated), then a page view per route change.
  useEffect(() => {
    initAnalytics(pathname);
    trackPageView(pathname);
    void ownPageView(pathname);
  }, [pathname]);
  useEffect(() => onConsentChange(() => refreshOwnConsent()), []);

  return (
    <QueryClientProvider client={ctx.queryClient}>
      {ctx.maintenance?.maintenance
        ? <MaintenanceScreen companyName={ctx.maintenance.company_name} />
        : <Outlet />}
      {measurable && <ConsentBanner />}
    </QueryClientProvider>
  );
}
