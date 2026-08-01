import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, AdminTodo } from "@/components/site/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Cabslink" },
      { name: "description", content: "How Cabslink uses cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy — Cabslink" },
      { property: "og:description", content: "How Cabslink uses cookies and similar technologies." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cabslink.com/cookies" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cabslink.com/cookies" }],
  }),
  component: () => (
    <LegalPage eyebrow="Cookies" title="Cookie Policy" updated="15 July 2026">
      <h2>1. What are cookies</h2>
      <p>Cookies are small text files stored by your browser. We use them and similar technologies (e.g. session storage) to run the site and remember your booking preferences.</p>
      <h2>2. Categories we use</h2>
      <ul>
        <li><strong>Strictly necessary</strong>: session, security, load balancing.</li>
        <li><strong>Functional</strong>: remembering booking widget selections between steps.</li>
        <li><strong>Analytics</strong>: aggregate usage measurement.</li>
      </ul>
      <AdminTodo note="If analytics or marketing cookies are added, list providers and add a consent banner." />
      <h2>3. Managing cookies</h2>
      <p>You can clear or block cookies through your browser settings. Blocking strictly necessary cookies may break the booking flow.</p>
    </LegalPage>
  ),
});
