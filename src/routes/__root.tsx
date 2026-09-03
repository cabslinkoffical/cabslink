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
import { MaintenanceScreen } from "../components/site/MaintenanceScreen";
import { ConsentBanner } from "../components/site/ConsentBanner";
import { initAnalytics, isMeasurablePath, trackPageView } from "../lib/analytics-ga";

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
};

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


    let maintenance: { maintenance: boolean; company_name: string | null } = { maintenance: false, company_name: null };
    if (!isExempt) {
      maintenance = await getSiteStatus();
      if (maintenance.maintenance) return { maintenance };
    }

    // Legacy-path redirects. Skip static assets, API routes, and admin.
    if (isExempt || p === "/") return { maintenance };
    try {
      const row = await resolvePublicRedirect({ data: { path: p } });
      if (row?.to_path && row.to_path !== p) {
        const code = Number(row.status_code) === 302 ? 302 : 301;
        throw redirect({ href: row.to_path, statusCode: code });
      }
    } catch (e: any) {
      // Rethrow router redirects; swallow lookup errors so the site keeps loading.
      if (e && (e.isRedirect || e.status === 301 || e.status === 302)) throw e;
    }
    return { maintenance };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { name: "description", content: "Fixed-fare UK airport transfers, private tours and executive travel with Cabslink. Flight tracking, meet & greet and 24/7 dispatch." },
      { name: "author", content: "Cabslink" },
      { name: "theme-color", content: "#0e182c" },
      { property: "og:site_name", content: "Cabslink" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { name: "twitter:title", content: "Cabslink | UK Airport Transfers & Luxury Travel Platform" },
      { property: "og:description", content: "Fixed-fare UK airport transfers, private tours and executive travel with Cabslink. Flight tracking, meet & greet and 24/7 dispatch." },
      { name: "twitter:description", content: "Fixed-fare UK airport transfers, private tours and executive travel with Cabslink. Flight tracking, meet & greet and 24/7 dispatch." },
      { property: "og:url", content: "https://cabslink.com/" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&family=Epilogue:wght@400;500;600;700&display=swap" },
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

  // Analytics: install once (consent-gated), then a page view per route change.
  useEffect(() => {
    initAnalytics(pathname);
    trackPageView(pathname);
  }, [pathname]);

  return (
    <QueryClientProvider client={ctx.queryClient}>
      {ctx.maintenance?.maintenance
        ? <MaintenanceScreen companyName={ctx.maintenance.company_name} />
        : <Outlet />}
      {measurable && <ConsentBanner />}
    </QueryClientProvider>
  );
}
