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

let cached: EmailAdapter | null = null;

/** Returns the configured email adapter. Provider selection happens here. */
export function getEmailAdapter(): EmailAdapter {
  if (cached) return cached;
  // Future: when process.env[EMAIL_PROVIDER_ENV_VARS.provider] === "resend"
  // and process.env[EMAIL_PROVIDER_ENV_VARS.resendApiKey] is present,
  // return a ResendAdapter. Until then, use the not-configured stub.
  cached = new NotConfiguredAdapter();
  return cached;
}

/** Test-only helper — inject an alternate adapter. */
export function _setEmailAdapterForTests(adapter: EmailAdapter | null) {
  cached = adapter;
}
