# CabsLink site-wide redesign strategy (homepage untouched)

## What we're aiming for
Every page except the homepage looks, reads and works like the homepage. Each page follows one "cone" structure: it starts with a broad answer and narrows to one booking action. Every fact is verified, nothing is invented, and nothing is published until you say so.

## Ground rules
- The homepage and everything it uses (booking form, vehicle carousel, tour cards, closing "Book now" band, homepage styles and button styles) stay exactly as they are. I take homepage screenshots on phone and laptop before starting and compare them after every group.
- Web addresses, canonicals, indexing, page titles and H1 headings stay as they are. If one is plainly wrong, I list it for you instead of changing it.
- Only facts already on the site or in the database: no new prices, guarantees, awards, statistics or VAT claims, no minibus/coach vehicles and no Northern Ireland claims. Missing facts go on a list for you.
- Booking, pricing and payment logic isn't changed; only how those pages look.
- Colours come from the brand set only (navy, gold, darker gold on light backgrounds, cream, secondary grey-blue). Trustpilot and map colours stay.

## How each group works
1. Before starting a group, I tell you its estimate.
2. I make the changes and check them on phone, tablet and laptop. The homepage is compared, and tests run.
3. I report what changed. Each group is reported separately and you can stop at any point. At the two checkpoints I stop and wait for your approval.

## The groups

| # | Group | What you'll see | Rough estimate* |
|---|---|---|---|
| 1 | Section headings | One heading style on every non-home page, sized like the homepage. Readable darker gold on light backgrounds and bright gold on navy. The duplicate area-page heading is removed and the bright-gold warning line fixed. | 2–4 credits |
| 2 | Top section | Homepage-style navy band with the same heading type, spacing, buttons and accessible breadcrumbs. Three variants: centred (marketing), booking-led (local pages) and reading-width (legal and blog). | 3–6 credits |
| ✋ | **Checkpoint 1** | Screenshots of Home, About, Services, one area page, one airport page and one legal page, on phone and laptop. **I wait for your approval.** | — |
| 3 | Spacing and widths | Homepage spacing and widths on local pages and in FAQ and long-text sections. FAQ headings match the homepage FAQ. Legal and blog keep a comfortable reading width with brand text colours instead of grey. | 2–4 credits |
| 4 | Cards and buttons | Service photo cards, content cards, tour and vehicle cards and form panels each match their homepage version, with one corner style and shared buttons only. | 3–5 credits |
| 5 | Cone structure (pilot) | One shared section pattern: answer, key facts, detail, proof, one action. Tried first on one service page, one area page, one airport page and About. | 3–5 credits |
| ✋ | **Checkpoint 2** | Screenshots of the four pilot pages. **I wait for your approval.** | — |
| 5b | Cone structure (rollout) | The same pattern on every other page type: hubs, destinations, service + town, routes, sports, travel solutions, legal, blog, contact and forms. | 6–10 credits |
| 6 | One-off pages | Fleet, Reviews, Tours detail, Services, Search and Image credits rebuilt with the shared pieces. Services ends with a single closing band instead of two. | 4–7 credits |
| 7 | Booking and payment pages | Brand-coloured status badges, and no marketing band while someone is booking, paying or managing a booking. Then the full tests and one test-mode card booking. | 2–3 credits |
| 8 | SEO, AEO and GEO pass | See the list below. | 5–8 credits |
| 9 | Final verification and report | Every page type on 375px phone, tablet and laptop. Contrast checks, every sitemap address returns OK, full tests, and the homepage before/after comparison. Then a short report and the list of facts I need from you. | 2–4 credits |

*These are rough figures based on what similar work has used in this project this month (73 credits so far). Actual use depends on what each group uncovers. I'll check the real usage after each group and tell you if a group is running over.

**Total rough range: about 32–56 credits across several sessions.**

## Cone structure (applies to every public page except the homepage)
1. **Answer (top):** the H1 plus 2–3 sentences saying what the page is for, who it serves, where, and how to book. Built only from verified facts.
2. **Key facts:** a short block with the essentials for that page type, such as vehicles available, typical journey time, meet & greet and a link to the cancellation policy. Each item appears only if the fact already exists.
3. **Detail:** the existing longer content, reordered under a clear H2/H3 order. Nothing useful is removed.
4. **Proof:** Google reviews summary, trust points and FAQ, only where real content exists.
5. **One action (bottom):** a single primary action that fits the page (for example "Get a quote for Edinburgh Airport", with the booking form prefilled where possible) plus the phone number. This is the shared closing band, shown once, with no competing buttons below it.

## SEO, AEO and GEO pass (group 8)
- One H1 per page and a correct heading order.
- Descriptive image alt text, with width and height set.
- Breadcrumb schema on every page. FAQ and service schema only where that content is visible on the page.
- Sitemap and internal links: remove region, council and route addresses that return "not found", using the same lookup the pages use.
- Airport detail pages respect their "hide from search" settings.
- Fix the canonical address on CMS pages whose override is a full web address.
- The area-page FAQ schema always matches the FAQ shown on the page.
- Child seats: area FAQs and travel-solutions pages say they're free, but checkout charges for them. The wording will match the real extras price.
- Blog contents links: headings get anchors so the links jump to the right place.
- Every internal link checked.
- About page: expanded with verified company details only. I'll ask you for anything missing.
- Pages with low click-through in Search Console: I'll propose new meta descriptions for your approval. Titles stay unchanged.

## Facts I may need from you along the way
- The meeting point for airport pickups (still open).
- Company details for the About page: founding year, licensing council, fleet size, team, and the areas you cover directly.
- Northern Ireland coverage: direct, partner, or none.
- Whether the minibus and coach pages should stay as information pages or redirect.

## Technical notes
- Shared components to change: PageHero/SectionHeader, LocalPageHero body sections, AreaLocationPage, ServiceLocationPage, JourneyPage, DestinationPage, HubPage, ContentSections, LegalPage, BlogArticle/BlogPostCard. A new shared ConePage section set (Answer, KeyFacts, Detail, Proof, Action) is added, built on the existing FinalCta without editing it.
- Bespoke routes: fleet, reviews, tours.$slug, services, search, image-credits, manage-booking, booking.$token, book.*.
- Not edited: index.tsx, BookingWidget, TourCard, FinalCta, homepage CSS blocks, button variants. New styles go in new scoped utilities or component variants.
- SEO fixes: effectiveNoindex on airports.$iata; canonicalUrl() in SeoPageRenderer; buildAreaFaqs for the area schema; extras price lookup for child-seat wording; rehype-slug with the shared slugify for the blog contents list; sitemap and link generation from the route resolvers.
