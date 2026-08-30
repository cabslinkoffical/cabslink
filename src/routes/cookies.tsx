import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Cabslink" },
      { name: "description", content: "How Cabslink uses cookies and similar technologies, which categories we set, and how you can control or clear them in your browser." },
      { property: "og:title", content: "Cookie Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink uses cookies and similar technologies, which categories we set, and how you can control or clear them in your browser." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/cookies" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/cookies" }],
  }),
  component: () => (
    <LegalPage eyebrow="Cookies" title="Cookie Policy" updated="30 August 2026">
      <h2>1. What are cookies</h2>
      <p>Cookies are small text files stored by your browser. We use them, and similar technologies such as local and session storage, to run the site and remember your booking progress.</p>

      <h2>2. What we use and why</h2>
      <ul>
        <li><strong>Strictly necessary</strong> — session and security cookies, sign-in for our admin team, and Cloudflare Turnstile tokens that protect our forms from automated abuse.</li>
        <li><strong>Functional</strong> — browser storage that remembers your booking widget selections and saved quote between steps, so you do not lose progress.</li>
        <li><strong>Mapping</strong> — Google Maps Platform sets storage needed for address lookup and route display on booking pages.</li>
      </ul>
      <p>We do not currently set advertising or cross-site tracking cookies. If we add analytics or marketing cookies in future, we will list the providers here and ask for your consent through a banner before setting them.</p>

      <h2>3. Managing cookies</h2>
      <p>You can clear or block cookies and site storage through your browser settings, and most browsers let you do this per site. Blocking strictly necessary cookies or storage will break the booking flow and address lookup.</p>

      <h2>4. More information</h2>
      <p>
        See our <a href="/privacy">Privacy Policy</a> for how we handle personal data, or contact{" "}
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with any question.
      </p>
    </LegalPage>
  ),
});
