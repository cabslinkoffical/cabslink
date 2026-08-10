// Provider-agnostic email adapter. Provider selection lives here so no
// call-site talks to a concrete provider (Resend / SendGrid / SES) SDK
// directly. Wiring a real provider later is a single change: implement
// `EmailAdapter`, register the branch in `getEmailAdapter()`, and set the
// required environment variables (see EMAIL_PROVIDER_ENV_VARS).
//
// Until a provider is configured, `NotConfiguredAdapter` is used. It NEVER
// claims a send succeeded, NEVER invents a provider message id, and always
// reports `config_missing` so notification records store `not_configured`
// (not `sent`, not `failed`).

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailErrorCategory =
  | "invalid_recipient"
  | "rate_limited"
  | "provider_unavailable"
  | "config_missing"
  | "unknown";

export type EmailSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; errorCategory: EmailErrorCategory; providerMessageId?: null };

export interface EmailAdapter {
  readonly name: string;
  /** True when a real external provider is wired up. `NotConfigured` returns false. */
  readonly configured: boolean;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

/** Environment variables required to switch to a real provider later. */
export const EMAIL_PROVIDER_ENV_VARS = {
  provider: "EMAIL_PROVIDER",            // e.g. "resend"
  resendApiKey: "RESEND_API_KEY",        // Resend API key (server-only)
  fromAddress: "EMAIL_FROM_ADDRESS",     // e.g. bookings@cabslink.co.uk
  fromName: "EMAIL_FROM_NAME",           // display name shown as From
} as const;

/**
 * Stub adapter used while no email provider is connected.
 * NEVER pretends to send. NEVER returns a provider id.
 */
class NotConfiguredAdapter implements EmailAdapter {
  readonly name = "not_configured";
  readonly configured = false;
  async send(_input: EmailSendInput): Promise<EmailSendResult> {
    return { ok: false, errorCategory: "config_missing", providerMessageId: null };
  }
}

/**
 * Resend adapter — routed through the Lovable connector gateway so no raw
 * provider key is handled here (the gateway swaps `X-Connection-Api-Key`
 * for the upstream Resend key). Requires:
 *   LOVABLE_API_KEY  (auto-provisioned)
 *   RESEND_API_KEY   (connector connection key)
 *   EMAIL_FROM_ADDRESS on a domain verified in Resend
 */
class ResendAdapter implements EmailAdapter {
  readonly name = "resend";
  readonly configured = true;

  constructor(
    private readonly lovableKey: string,
    private readonly connectionKey: string,
    private readonly from: string,
  ) {}

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    let res: Response;
    try {
      res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.lovableKey}`,
          "X-Connection-Api-Key": this.connectionKey,
        },
        body: JSON.stringify({
          from: this.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        }),
      });
    } catch {
      return { ok: false, errorCategory: "provider_unavailable", providerMessageId: null };
    }

    if (res.ok) {
      let id: string | null = null;
      try {
        const body: any = await res.json();
        id = typeof body?.id === "string" ? body.id : null;
      } catch { /* accepted but unparsable body */ }
      return { ok: true, providerMessageId: id };
    }

    // Surface the provider's status/body in logs; never swallow it.
    let detail = "";
    try { detail = (await res.text()).slice(0, 500); } catch { /* ignore */ }
    // eslint-disable-next-line no-console
    console.error(`resend send failed [${res.status}]: ${detail}`);
    const category: EmailErrorCategory =
      res.status === 429 ? "rate_limited"
        : res.status === 401 || res.status === 403 ? "config_missing"
          : res.status === 422 || res.status === 400 ? "invalid_recipient"
            : res.status >= 500 ? "provider_unavailable"
              : "unknown";
    return { ok: false, errorCategory: category, providerMessageId: null };
  }
}

let cached: EmailAdapter | null = null;

/** Returns the configured email adapter. Provider selection happens here. */
export function getEmailAdapter(): EmailAdapter {
  if (cached) return cached;
  // Read env inside the call — env is injected per request on the server
  // runtime, so a module-scope read would be undefined.
  const provider = (process.env[EMAIL_PROVIDER_ENV_VARS.provider] ?? "resend").toLowerCase();
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env[EMAIL_PROVIDER_ENV_VARS.resendApiKey];
  const address = process.env[EMAIL_PROVIDER_ENV_VARS.fromAddress];
  const fromName = process.env[EMAIL_PROVIDER_ENV_VARS.fromName];

  if (provider === "resend" && lovableKey && connectionKey && address) {
    const from = fromName ? `${fromName} <${address}>` : address;
    cached = new ResendAdapter(lovableKey, connectionKey, from);
    return cached;
  }

  // Anything missing → never pretend to send.
  cached = new NotConfiguredAdapter();
  return cached;
}

/** Test-only helper — inject an alternate adapter. */
export function _setEmailAdapterForTests(adapter: EmailAdapter | null) {
  cached = adapter;
}
