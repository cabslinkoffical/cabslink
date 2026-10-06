import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { installQueryReadinessCompatibility } from "@/lib/router-query-compat";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Dehydrate the server query cache into the HTML so loader-primed data is
  // available on first client render (prevents hydration mismatches / flashes).
  setupRouterSsrQueryIntegration({ router, queryClient });
  installQueryReadinessCompatibility(router);

  return router;
};
