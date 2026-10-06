import { describe, it, expect, vi } from "vitest";
import { createRouter, createRootRoute } from "@tanstack/react-router";
import { installQueryReadinessCompatibility } from "@/lib/router-query-compat";

describe("SSR query readiness compatibility", () => {
  it("preserves lifecycle hooks and dehydration payload, marking readiness only afterwards", async () => {
    const attached = vi.fn();
    const router = createRouter({ routeTree: createRootRoute() });
    router.serverSsrLifecycle = { onServerSsrAttach: [attached] };
    router.options.dehydrate = async () => ({ cachedQueries: true });
    installQueryReadinessCompatibility(router);
    // Only the lifecycle method used by the helper is needed for this fixture.
    const ssr = {} as Parameters<NonNullable<typeof router.serverSsrLifecycle.onServerSsrAttach>[number]>[0];
    router.serverSsrLifecycle.onServerSsrAttach?.forEach((hook) => hook(ssr));
    expect(attached).toHaveBeenCalledWith(ssr);
    const ready = Reflect.get(ssr, "isDehydrated");
    expect(ready()).toBe(false);
    expect(await router.options.dehydrate?.()).toEqual({ cachedQueries: true });
    expect(ready()).toBe(true);
  });
});