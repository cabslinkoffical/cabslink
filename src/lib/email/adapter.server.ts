// Provider-agnostic email adapter. The concrete provider (Resend, SendGrid,
// SES, etc.) is wired in later — call sites never talk to a provider SDK
// directly. During Phase 2A we ship a `log` adapter that records the send
// in notification_log without contacting an external service.
//
// Swapping providers is a single change here: implement `EmailAdapter` and
// return it from `getEmailAdapter()`.

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type EmailSendResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; errorCategory: EmailErrorCategory; providerMessageId?: null };

export type EmailErrorCategory =
  | "invalid_recipient"
  | "rate_limited"
  | "provider_unavailable"
  | "config_missing"
  | "unknown";

export interface EmailAdapter {
  readonly name: string;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

/** Stub adapter — succeeds locally, records nothing to any external service. */
class LogAdapter implements EmailAdapter {
  readonly name = "log";
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    // eslint-disable-next-line no-console -- server-side only; body is not logged
    console.info(`[email:log] to=<redacted> subject=${JSON.stringify(input.subject)}`);
    return { ok: true, providerMessageId: null };
  }
}

let cached: EmailAdapter | null = null;

/** Returns the configured email adapter. Provider selection happens here. */
export function getEmailAdapter(): EmailAdapter {
  if (cached) return cached;
  // Future: switch on process.env.EMAIL_PROVIDER ("resend"|"sendgrid"|...)
  cached = new LogAdapter();
  return cached;
}

/** Test-only helper — inject an alternate adapter. */
export function _setEmailAdapterForTests(adapter: EmailAdapter | null) {
  cached = adapter;
}
