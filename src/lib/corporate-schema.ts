import { z } from "zod";

export const corporateInput = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(30),
  needs: z.string().trim().min(10).max(1500),
  website: z.string().trim().max(500).optional().default(""),
  /** Cloudflare Turnstile token; required only when captcha is configured. */
  captchaToken: z.string().trim().max(4096).optional().nullable(),
});

export type CorporateInput = z.infer<typeof corporateInput>;
