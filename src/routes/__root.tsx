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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { resolvePublicRedirect } from "../lib/seo-public.functions";

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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    // Skip static assets, API routes, and admin — cheap short-circuit before RPC.
    const p = location.pathname;
    if (!p || p === "/" || p.startsWith("/api/") || p.startsWith("/admin") ||
        p.startsWith("/_") || /\.[a-z0-9]{2,5}$/i.test(p)) return;
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
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cabslink — Premium UK Airport Transfers & Airport Travel Services" },
      { name: "description", content: "Reliable, on-time UK airport transfers and luxury airport travel services. 24/7 booking, flight tracking, meet & greet across the UK." },
      { name: "author", content: "Cabslink" },
      { name: "theme-color", content: "#0e182c" },
      { property: "og:site_name", content: "Cabslink" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Cabslink — Premium UK Airport Transfers & Airport Travel Services" },
      { name: "twitter:title", content: "Cabslink — Premium UK Airport Transfers & Airport Travel Services" },
      { property: "og:description", content: "Reliable, on-time UK airport transfers and luxury airport travel services. 24/7 booking, flight tracking, meet & greet across the UK." },
      { name: "twitter:description", content: "Reliable, on-time UK airport transfers and luxury airport travel services. 24/7 booking, flight tracking, meet & greet across the UK." },
      { property: "og:url", content: "https://cabslink.com/" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
    <html lang="en">
      <head><HeadContent /></head>
      <body suppressHydrationWarning>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
