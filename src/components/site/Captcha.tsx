import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getCaptchaConfig } from "@/lib/captcha.functions";

type Turnstile = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
      action?: string;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const existing = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (existing) return resolve(existing);
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = (window as unknown as { turnstile?: Turnstile }).turnstile;
      if (api) resolve(api);
      else reject(new Error("Turnstile unavailable"));
    };
    script.onerror = () => reject(new Error("Turnstile script blocked"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function TurnstileWidget({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string;
  action?: string;
  onToken: (token: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let widgetId: string | undefined;
    let api: Turnstile | undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !hostRef.current) return;
        api = turnstile;
        widgetId = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          theme: "auto",
          ...(action ? { action } : {}),
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      try {
        if (api && widgetId) api.remove(widgetId);
      } catch {
        /* noop */
      }
    };
  }, [siteKey, action, onToken]);

  return (
    <div className="space-y-2">
      <div ref={hostRef} />
      {failed ? (
        <p className="text-xs text-muted-foreground">
          The security check could not load. Disable any ad/script blocker, then reload the page.
        </p>
      ) : null}
    </div>
  );
}

export type CaptchaState = {
  /** Token to send to the server, or null when unsolved / not required. */
  token: string | null;
  /** True when a challenge is configured and must be solved before submitting. */
  required: boolean;
  /** True when the form may be submitted (no challenge, or challenge solved). */
  ready: boolean;
  /** Render this inside the form. */
  widget: React.ReactNode;
  /** Clear the token and re-arm the challenge after a submit. */
  reset: () => void;
};

/**
 * Adds a Cloudflare Turnstile challenge to a public form. When captcha is not
 * configured the hook is inert: no widget, `required: false`, `ready: true`.
 */
export function useCaptcha(action?: string): CaptchaState {
  const { data } = useQuery({
    queryKey: ["captcha-config"],
    queryFn: () => getCaptchaConfig(),
    staleTime: Infinity,
    retry: false,
  });
  const siteKey = data?.siteKey ?? null;
  const [token, setToken] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const handleToken = useCallback((next: string | null) => setToken(next), []);
  const reset = useCallback(() => {
    setToken(null);
    setNonce((n) => n + 1);
  }, []);

  return {
    token,
    required: Boolean(siteKey),
    ready: !siteKey || Boolean(token),
    reset,
    widget: siteKey ? (
      <TurnstileWidget key={`${siteKey}:${nonce}`} siteKey={siteKey} action={action} onToken={handleToken} />
    ) : null,
  };
}
