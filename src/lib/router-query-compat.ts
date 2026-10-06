import type { AnyRouter } from "@tanstack/react-router";

/** Preserve the query adapter's readiness contract across the router update. */
export function installQueryReadinessCompatibility(router: AnyRouter) {
  let dehydrated = false;
  router.serverSsrLifecycle = {
    ...router.serverSsrLifecycle,
    onServerSsrAttach: [
      ...(router.serverSsrLifecycle?.onServerSsrAttach ?? []),
      (serverSsr) => {
        if (!("isDehydrated" in serverSsr)) {
          Object.assign(serverSsr, { isDehydrated: () => dehydrated });
        }
      },
    ],
  };
  const dehydrate = router.options.dehydrate;
  if (dehydrate) {
    router.options.dehydrate = async () => {
      const state = await dehydrate();
      dehydrated = true;
      return state;
    };
  }
}