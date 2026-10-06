/**
 * Site-wide structured data: Organization + TaxiService (one node,
 * @id https://cabslink.com/#business) and WebSite with SearchAction.
 * Real facts only — values come from FACTS / SITE.
 */
import { SITE } from "@/lib/site";

export const BUSINESS_ID = "https://cabslink.com/#business";
export const WEBSITE_ID = "https://cabslink.com/#website";

export function businessGraph(opts: { googleBusinessProfileUrl?: string | null } = {}) {
  const sameAs = [
    "https://www.trustpilot.com/review/cabslink.com",
    ...Object.values(SITE.social),
    ...(opts.googleBusinessProfileUrl ? [opts.googleBusinessProfileUrl] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "TaxiService"],
        "@id": BUSINESS_ID,
        name: "Cabslink",
        legalName: "Cabslink Limited",
        url: "https://cabslink.com",
        logo: "https://cabslink.com/__l5e/assets-v1/4150bb87-69a7-4e1d-bedb-54293074a958/cabslink-logo-gold.png",
        email: SITE.email,
        telephone: SITE.phoneUK,
        identifier: { "@type": "PropertyValue", name: "Companies House number", value: "SC814706" },
        address: {
          "@type": "PostalAddress",
          streetAddress: "263a Leith Walk",
          addressLocality: "Edinburgh",
          postalCode: "EH6 8NY",
          addressCountry: "GB",
        },
        // TODO(owner): geo coordinates of the registered office — not supplied, so omitted.
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          opens: "00:00",
          closes: "23:59",
        },
        areaServed: { "@type": "Country", name: "United Kingdom" },
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: "Cabslink",
        url: "https://cabslink.com",
        inLanguage: "en-GB",
        publisher: { "@id": BUSINESS_ID },
        potentialAction: {
          "@type": "SearchAction",
          target: "https://cabslink.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}
