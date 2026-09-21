/**
 * Recovery for long-lived browser profiles that keep serving an old build.
 *
 * Two independent causes are handled:
 *  1. A service worker registered by an earlier version of the site (or a
 *     previous site on the same origin) intercepting requests forever.
 *  2. A cached document referencing hashed chunks that no longer exist, which
 *     surfaces as a dynamic-import / chunk-load error rather than a blank page.
 *
 * Incognito and fresh profiles are unaffected, which is exactly the reported
 * symptom.
 */

const RELOAD_FLAG = "cabslink:stale-reload";

function hardReloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    /* storage blocked — still worth one reload */
  }
  location.reload();
}

function isChunkLoadFailure(message: string) {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading (?:CSS )?chunk .* failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

async function purgeStaleCaches() {
  let purged = false;

  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        purged = true;
      }
    } catch {
      /* ignore */
    }
  }

  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        purged = true;
      }
    } catch {
      /* ignore */
    }
  }

  return purged;
}

export function installStaleCacheRecovery() {
  if (typeof window === "undefined") return;

  void purgeStaleCaches().then((purged) => {
    if (purged) hardReloadOnce();
  });

  window.addEventListener("error", (event) => {
    const message = String((event as ErrorEvent).message ?? "");
    if (isChunkLoadFailure(message)) {
      void purgeStaleCaches().then(() => hardReloadOnce());
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = (event as PromiseRejectionEvent).reason;
    const message = String((reason && (reason.message ?? reason)) ?? "");
    if (isChunkLoadFailure(message)) {
      void purgeStaleCaches().then(() => hardReloadOnce());
    }
  });
}
