# Site-wide redesign to the homepage standard (homepage untouched)

## Goal

Make every public page look and behave like it belongs with the homepage: the same navy and gold, the same fonts, spacing, headings, buttons and cards. Each page keeps its own purpose and content, and nothing is invented.

## Ground rules

- The homepage, and the shared pieces it uses (booking form, vehicle carousel, tour cards, closing "Book now" band), stay exactly as they are. Every change is checked against a homepage screenshot taken before and after.
- Web addresses, canonicals and indexing stay unchanged, as before. Page titles and H1 headings also stay unchanged unless one is plainly wrong; I'll list any of those for you rather than change them silently.
- Only verified facts: no new prices, guarantees, awards, statistics, VAT claims, minibus/coach vehicles or Northern Ireland claims.
- Booking, pricing and payment logic isn't touched; only how those pages look.
- Nothing is published until you say so.

## What the audit found (largest reach first)

1. **Top section on about 41 page types** (services, sports, travel solutions, hubs, legal, about, contact, airports list, routes list and others). The heading size, alignment, buttons and spacing differ from the homepage. Gold section labels sit on white, which is hard to read (2:1 contrast instead of the 5.6:1 darker gold), and the breadcrumbs differ from the shared ones.
2. **Location pages** (areas, airports, destinations, service + town, routes). The top section is already shared, but the sections below use three different heading sizes, uneven spacing and mixed button and card corner styles. One warning line uses bright gold on a light background.
3. **FAQ and long-text sections** use smaller headings than the homepage FAQ. The legal pages use a grey text style instead of the brand one.
4. **Blog** articles and cards have their own top section and a grey text style.
5. **Pages with their own one-off design**: Fleet, Reviews, Tours detail, Services, Search and Image credits. They use separate top sections and buttons. The Services page shows two closing booking bands, one after the other.
6. **Booking, Manage Booking and payment pages** show an off-brand blue status badge. They also show the marketing "Book now" band in the middle of checkout.

## Work, in order (one group at a time, checked before moving on)

1. **Shared section heading**: one heading style for all non-home pages, sized like the homepage, darker gold on light backgrounds and bright gold on navy. Remove the duplicate heading style on area pages.
2. **Shared top section**: homepage-style navy band with the same heading type, spacing and button style, and the shared accessible breadcrumbs. Variants: centred for marketing pages, booking-led for local pages, reading-width for legal and blog pages.
3. **Section spacing and widths**: local pages, FAQ and long-text sections use the homepage spacing and widths. Legal and blog keep a comfortable reading width.
4. **Cards and buttons**: each card type (service photo, content card, tour and vehicle, form panel) uses its homepage equivalent, and buttons use the shared button styles only.
5. **One-off pages**: Fleet, Reviews, Tours detail, Services, Search and Image credits are rebuilt with the shared pieces. Services keeps a single closing band.
6. **Checkout and Manage Booking**: brand status badges, and no marketing band while someone is booking or paying.
7. **SEO, AEO and GEO pass**, without changing protected titles, H1s or URLs:
  - one H1 per page and a correct heading order
  - descriptive image alt text and sizes
  - breadcrumb schema everywhere
  - FAQ and service schema only where the page shows that content
  - short, direct answer paragraphs on service and location pages, built only from existing verified facts
  - internal links checked
  - About page: expanded with verified company details only (Search Console shows 153 impressions but only 1 click). I'll ask you for any facts I don't have.
8. **Verification**: every page type checked on phone, tablet and laptop (no sideways scrolling, clipped text or broken images), contrast checked, all sitemap pages return OK, the full test suite runs, and the homepage is compared before and after.

## Technical notes

- Shared components to change: PageHero/SectionHeader, LocalPageHero body sections, AreaLocationPage, ServiceLocationPage, JourneyPage, DestinationPage, HubPage, ContentSections (FAQ/long-form), LegalPage, BlogArticle/BlogPostCard. Bespoke routes: fleet, reviews, tours.$slug, services, search, image-credits, manage-booking, booking.$token, book.*.
- Homepage dependencies (index.tsx, BookingWidget, TourCard, FinalCta, homepage CSS in styles.css, button variants) are not edited. New styles go in new, scoped utilities or component variants.
- SiteLayout `hideCta` is turned on for book.*, booking.$token and manage-booking.
- Colours come from the existing tokens only (navy, gold, gold-ink, cream, secondary text). Hardcoded palette classes on non-home pages are replaced by tokens; third-party brand colours (Trustpilot, map pins) stay.
- Size: about 60 route files and 15 shared components, done in batches with a check after each group. Expect several working sessions.  
  
  
Site-wide redesign to the homepage standard, plus a "cone" content structure on every page. Work in groups, check each group before moving on, and publish nothing until I say so. Before starting each group, tell me its credit estimate.
  GROUND RULES
  - The homepage and the shared pieces it uses (index.tsx, BookingWidget, vehicle carousel, TourCard, FinalCta, homepage CSS in styles.css, button variants) stay exactly as they are. Take a homepage screenshot before work starts and compare it after every group.
  - URLs, canonicals, indexing, page titles and H1s stay unchanged. If a title or H1 is plainly wrong, list it for me rather than changing it.
  - Only verified facts. No new prices, guarantees, awards, statistics, VAT claims, minibus/coach vehicles or Northern Ireland claims. If a page lacks a fact it needs, list it for me instead of filling the gap.
  - Booking, pricing and payment logic is not touched, only how those pages look.
  - Colours come from existing tokens only (navy, gold, gold-ink, cream, secondary text). Replace hard-coded palette classes on non-home pages with tokens. Third-party brand colours (Trustpilot, map pins) stay.
  - New styles go in new scoped utilities or component variants, never by editing homepage dependencies.
  GROUP 1: Shared section heading
  One heading style for all non-home pages, sized like the homepage. Use the darker gold (about 5.6:1 contrast) on light backgrounds and bright gold on navy. Remove the duplicate heading style on area pages, and fix the bright-gold warning line on light backgrounds.
  GROUP 2: Shared top section
  A homepage-style navy band with the same heading type, spacing, button style and the shared accessible breadcrumbs. Variants: centred for marketing pages, booking-led for local pages, reading-width for legal and blog pages.
  CHECKPOINT: stop and show me screenshots of the homepage, About, Services, one area page, one airport page and one legal page, on phone and laptop. Don't continue until I approve the look.
  GROUP 3: Spacing and widths
  Local pages, FAQ and long-text sections use homepage spacing and widths. FAQ headings match the homepage FAQ. Legal and blog pages keep a comfortable reading width and use the brand text style, not grey.
  GROUP 4: Cards and buttons
  Each card type (service photo, content card, tour and vehicle, form panel) uses its homepage equivalent. Buttons use the shared button styles only, with consistent corner radius.
  GROUP 5: Cone content structure (every public page except the homepage)
  Build one shared page-section pattern so every page narrows from the broad answer to one action, in this order:
  1. Top (widest): H1 plus a 2–3 sentence direct answer saying what the page is for, who it serves, where, and how to book. Built only from existing verified facts.
  2. Key facts: a short scannable block with the essentials for that page type, e.g. vehicles available, typical journey time, meet & greet, flight tracking, link to the cancellation policy. Only facts already on the site or in the database.
  3. Detail: the existing longer content, reordered and tightened under a logical H2/H3 order. Don't remove existing content.
  4. Proof: reviews summary, trust points and FAQ, only where real content exists.
  5. Point (narrowest): one primary action matching the page (e.g. "Get a quote for Edinburgh Airport", prefilling the booking form where possible) plus the phone number. No competing calls to action lower down. This is the shared closing band, shown once.
  CHECKPOINT: apply it first to one service page, one area page, one airport page and About, and show me screenshots before rolling it out.
  GROUP 6: One-off pages
  Rebuild Fleet, Reviews, Tours detail, Services, Search and Image credits with the shared pieces and the cone structure. Services keeps a single closing band (it currently shows two).
  GROUP 7: Booking, Manage Booking and payment pages
  Brand-coloured status badges instead of the blue one. Set SiteLayout hideCta on book.*, booking.$token and manage-booking so there's no marketing band during booking or payment. Afterwards run the full tests and do one Stripe test-mode booking to confirm the flow still works.
  GROUP 8: SEO, AEO and GEO pass (titles, H1s and URLs stay protected)
  - One H1 per page and correct heading order.
  - Descriptive image alt text with width and height set.
  - Breadcrumb schema everywhere. FAQ and service schema only where the page visibly shows that content.
  - Sitemaps and internal links include region, council and route destination URLs that return 404. Generate them from the same resolver the routes use.
  - Airport detail pages ignore noindex and seo tier; apply effectiveNoindex.
  - SeoPageRenderer builds the canonical as origin + canonical_override, which breaks when the override is a full URL. Use canonicalUrl().
  - Area page FAQ schema uses faqsFor() when there are no airports, but the page shows buildAreaFaqs(). Always use the visible FAQ.
  - Area FAQs and travel-solutions say child seats are free, but checkout charges for them. Use the extras price.
  - Blog table-of-contents links don't work because headings have no ids. Add rehype-slug with the same slugify.
  - Check every internal link resolves.
  - About page: expand it with verified company details only, and ask me for any facts you don't have.
  - List the pages with low click-through in Search Console and propose new meta descriptions for me to approve. Don't change titles.
  GROUP 9: Verification
  - Check every page type on phone (375px), tablet and laptop: no sideways scrolling, clipped text or broken images.
  - Check colour contrast.
  - Confirm every sitemap URL returns 200.
  - Run the full test suite.
  - Compare the homepage before and after: it must be unchanged.
  - Give me a short report of what changed, what you skipped and why, and any facts you need from me.  
    
    
    
  now make streatgy again complrtely and tell me 
- &nbsp;