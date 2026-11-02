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
