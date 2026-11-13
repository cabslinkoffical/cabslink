/**
 * Owner-requested SEO landing pages (13 Nov 2026 brief, point 6).
 *
 * Facts here reuse only what the project already states elsewhere: published
 * tours (listed live from the tours table by slug), vehicle capacities from
 * the fleet copy, route distances already printed on airport/route pages, and
 * the standard flight-tracking and Meet & Greet wording. Anything not in the
 * project is marked TODO(owner) instead of being guessed.
 */
import type { ContentSection, ContentFaq } from "@/components/site/ContentSections";

export type LandingPage = {
  path: string;
  eyebrow: string;
  h1: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  breadcrumbLabel: string;
  serviceType: string;
  sections: ContentSection[];
  /** Published tour slugs to list (unpublished ones simply don't appear). */
  tourSlugs?: string[];
  primaryTo: "/book" | "/book/tour";
  links: { label: string; to: string }[];
  faqs: ContentFaq[];
};

const FLEET =
  "Our saloons carry up to four passengers with two large cases, the Estate Car four passengers with three cases, the Standard MPV four passengers with four cases, the Seven-Seater MPV six passengers with three cases, the Premium MPV seven passengers with seven cases and the Eight-Seater Van eight passengers with eight cases.";
const FLIGHT =
  "Add your flight number when you book and our team will track your flight and adjust your pickup if it lands early or late.";
const MEET = "Meet & Greet is available on every booking for a small extra charge, shown in your quote.";
const PRICE_FAQ: ContentFaq = {
  q: "How do I get a price?",
  a: "Enter your pickup, destination, date and time in the booking form. You see a fixed price for each vehicle class before you pay, and that price does not change with traffic.",
};

export const LANDING_PAGES: Record<string, LandingPage> = {
  "/glasgow-airport-transfers": {
    path: "/glasgow-airport-transfers",
    eyebrow: "Glasgow Airport",
    h1: "Glasgow Airport transfers at a fixed price.",
    subtitle: "Private cars between Glasgow Airport (GLA), Edinburgh, Loch Lomond and the rest of Scotland, priced before you book.",
    metaTitle: "Glasgow Airport Transfers | Fixed Price Taxis | Cabslink",
    metaDescription: "Glasgow Airport transfers to Edinburgh, Loch Lomond and across Scotland. Pre-booked private cars, flight tracking and a fixed price before you travel.",
    breadcrumbLabel: "Glasgow Airport Transfers",
    serviceType: "Airport transfer",
    primaryTo: "/book",
    sections: [
      { title: "Getting out of Glasgow Airport", paragraphs: [
        "Glasgow Airport (GLA) sits in Paisley, west of the city, which makes it the natural gateway for travellers heading to the west of Scotland. A pre-booked car means you know who is collecting you, which vehicle is coming and what it costs before you land.",
        FLIGHT + " " + MEET,
      ] },
      { title: "Popular journeys from GLA", paragraphs: [
        "Our most-booked run from Glasgow Airport is Loch Lomond: about 20 miles from the terminal to Balloch along the A82 through Dumbarton, usually about 35 minutes. Many guests also travel straight to Edinburgh, or book the reverse journey from Edinburgh to Glasgow Airport for an early departure.",
        "Each of those journeys has its own page with live fixed prices for every vehicle class, calculated by the same engine used at checkout.",
      ] },
      { title: "The right car for your bags", paragraphs: [
        FLEET + " Child seats can be added during booking, priced per seat.",
        "Travelling on after a few days in the west? Book the second journey at the same time and both fixed prices appear together, so the whole trip is costed before you leave home.",
      ] },
    ],
    links: [
      { label: "Glasgow Airport guide", to: "/airports/glasgow-airport" },
      { label: "Glasgow Airport to Edinburgh", to: "/routes/glasgow-airport-to-edinburgh" },
      { label: "Glasgow Airport to Loch Lomond", to: "/routes/glasgow-airport-to-loch-lomond" },
      { label: "Edinburgh to Glasgow Airport", to: "/routes/edinburgh-to-glasgow-airport" },
    ],
    faqs: [
      PRICE_FAQ,
      { q: "What if my flight into Glasgow is delayed?", a: FLIGHT + " Waiting time of 60 minutes is free from your flight's actual landing time." },
      { q: "Can you take us from Glasgow Airport to Edinburgh?", a: "Yes. Glasgow Airport to Edinburgh is one of our regular routes, with a fixed price for each vehicle class shown on its route page and in the booking form." },
    ],
  },

  "/edinburgh-chauffeur": {
    path: "/edinburgh-chauffeur",
    eyebrow: "Chauffeur service",
    h1: "Edinburgh chauffeur service with a professional driver.",
    subtitle: "Executive cars and a professional chauffeur for airport runs, meetings, events and days out in and around Edinburgh.",
    metaTitle: "Edinburgh Chauffeur Service | Executive Cars | Cabslink",
    metaDescription: "Edinburgh chauffeur service for airport runs, meetings and events. Executive cars, professional drivers, hourly hire and a fixed price before you book.",
    breadcrumbLabel: "Edinburgh Chauffeur",
    serviceType: "Chauffeur service",
    primaryTo: "/book",
    sections: [
      { title: "A chauffeur for the journeys that matter", paragraphs: [
        "Our Edinburgh chauffeur service is for journeys where comfort, quiet and punctuality come first: collecting a client from Edinburgh Airport, getting a board to a meeting at Gogarburn or Edinburgh Park, or arriving at a wedding or dinner without thinking about parking.",
        "Every journey is pre-booked and quoted as a fixed price, so you know the cost before you confirm. For airport collections, " + FLIGHT.charAt(0).toLowerCase() + FLIGHT.slice(1),
      ] },
      { title: "By the journey or by the hour", paragraphs: [
        "Book a single transfer from door to door, or hire a car and chauffeur by the hour when your plans have several stops: a run of meetings across the city, a day of viewings, or an evening event with an uncertain finish time. Hourly hire is booked online with its rate shown before you pay.",
        MEET + " Your chauffeur then waits in arrivals with a name board.",
      ] },
      { title: "Choosing the car", paragraphs: [
        "Choose the vehicle class that fits your party and luggage when you book. " + FLEET,
        "Need regular travel for your company? Corporate accounts keep bookings and invoices in one place.",
      ] },
    ],
    links: [
      { label: "Executive transfers", to: "/executive-transfers" },
      { label: "Hourly hire", to: "/book/hourly" },
      { label: "Our fleet", to: "/fleet" },
      { label: "Corporate accounts", to: "/corporate-booking" },
    ],
    faqs: [
      PRICE_FAQ,
      { q: "Can I hire a chauffeur by the hour in Edinburgh?", a: "Yes. Choose hourly hire, set the start time and number of hours, and you see the price before you pay." },
      { q: "Do you meet clients at Edinburgh Airport?", a: MEET + " Your chauffeur waits in arrivals with a name board. " + FLIGHT },
    ],
  },

  "/highlands-private-tours": {
    path: "/highlands-private-tours",
    eyebrow: "Highlands tours",
    h1: "Private Highlands tours from Edinburgh.",
    subtitle: "Your own car and driver for Glencoe, Loch Lomond, Fort William and Glenfinnan, with a set price per vehicle.",
    metaTitle: "Highlands Private Tours from Edinburgh | Cabslink",
    metaDescription: "Highlands private tours from Edinburgh: Glencoe, Loch Lomond, Fort William and Glenfinnan with your own driver and a set price per vehicle, not per seat.",
    breadcrumbLabel: "Highlands Private Tours",
    serviceType: "Private driver tour",
    primaryTo: "/book/tour",
    tourSlugs: ["glencoe-highlands-private-day", "west-highland-grand-tour", "edinburgh-fort-william-scenic", "jacobite-legacy-glenfinnan-glencoe", "harry-potter-highland-expedition", "highlands-escape-loch-lomond-trossachs", "loch-lomond-trossachs-explorer"],
    sections: [
      { title: "The Highlands without a coach", paragraphs: [
        "A private Highlands tour means the car waits for you, not the other way round. Stop at a viewpoint for as long as you like, skip what does not interest you and travel with only your own group.",
        "Our ready-made Highlands tours from Edinburgh cover Glencoe and the Three Sisters, Loch Lomond and the Trossachs, Fort William and Glenfinnan. Each shows its length and what the price covers on its own page, and the price is per vehicle, not per seat.",
      ] },
      { title: "Build your own Highland day", paragraphs: [
        "If none of the ready-made routes fits, use the custom tour planner: choose your start and finish, add the stops you want and see the best order before you apply it. Where a custom day cannot be priced instantly, you can request a quote instead.",
        "Highland days are long, so we suggest an early start. Tell us about luggage, walking needs or child seats when you book so we send the right vehicle.",
      ] },
      { title: "Vehicles for your group", paragraphs: [
        FLEET + " Larger groups can book more than one vehicle on the same tour.",
      ] },
    ],
    links: [
      { label: "All private tours", to: "/tours" },
      { label: "Edinburgh to Fort William", to: "/routes/edinburgh-to-fort-william" },
      { label: "Edinburgh to Inverness", to: "/routes/edinburgh-to-inverness" },
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
    ],
    faqs: [
      { q: "Is the tour price per person?", a: "No. Ready-made tour prices are per vehicle, so the whole group shares one car and one price." },
      { q: "Can we change the stops?", a: "Yes. Use the custom tour planner to choose your own stops, or tell us your wishes in the notes when booking a ready-made tour." },
      { q: "Can a large group travel together?", a: "Yes. Big groups can book several vehicles on one tour booking, and each vehicle is priced on its own." },
    ],
  },

  "/loch-ness-tours": {
    path: "/loch-ness-tours",
    eyebrow: "Loch Ness",
    h1: "Private Loch Ness tours from Edinburgh.",
    subtitle: "Plan a custom day to Loch Ness with your own driver, or book a transfer to Inverness and the Great Glen.",
    metaTitle: "Loch Ness Private Tours from Edinburgh | Cabslink",
    metaDescription: "Loch Ness private tours from Edinburgh with your own driver. Plan a custom day to the loch, priced before you pay, or book a fixed-price transfer.",
    breadcrumbLabel: "Loch Ness Tours",
    serviceType: "Private driver tour",
    primaryTo: "/book/tour",
    sections: [
      { title: "A private day to Loch Ness", paragraphs: [
        "Loch Ness is one of the longest day trips you can take from Edinburgh, which is exactly why a private car helps: you travel at your own pace, choose your own stops on the way and only share the car with your own group.",
        "Our Loch Ness day-trip guide lists Edinburgh to Drumnadrochit via the A9 and Inverness at about 170 miles and three and a half hours each way. These are planning estimates, not guaranteed journey times; stops and traffic add to the day.",
        "We do not run a ready-made Loch Ness tour yet, so you plan it in the custom tour planner. Choose Edinburgh as your start, add Loch Ness and any stops you want along the way, and see the best order before you apply it. If a day cannot be priced instantly, request a quote and we will come back to you.",
      ] },
      { title: "Or stay a night in the Highlands", paragraphs: [
        "Many visitors prefer not to fit Loch Ness into one day. Book a transfer from Edinburgh to Inverness and use Add return if you already know when you are coming back. Edinburgh to Inverness has its own route page with fixed prices for every vehicle class.",
        "Shorter on time? Our ready-made Highlands tours to Glencoe, Fort William and Glenfinnan give a full Highland day closer to Edinburgh.",
      ] },
      { title: "Vehicles and comfort", paragraphs: [
        FLEET + " Child seats can be added when you book, priced per seat.",
      ] },
    ],
    links: [
      { label: "Loch Ness day trip guide", to: "/blog/loch-ness-day-trip-from-edinburgh" },
      { label: "Edinburgh to Inverness", to: "/routes/edinburgh-to-inverness" },
      { label: "Highlands private tours", to: "/highlands-private-tours" },
      { label: "All private tours", to: "/tours" },
    ],
    faqs: [
      { q: "Do you have a ready-made Loch Ness tour?", a: "Not yet. Plan your Loch Ness day in the custom tour planner, or book a fixed-price transfer to Inverness." },
      { q: "Is a Loch Ness day trip from Edinburgh too long?", a: "It is a long day. If you would rather not rush, book a transfer to Inverness and stay overnight near the loch." },
      PRICE_FAQ,
    ],
  },

  "/isle-of-skye-tours": {
    path: "/isle-of-skye-tours",
    eyebrow: "Isle of Skye",
    h1: "Private Isle of Skye tours and transfers.",
    subtitle: "Plan a private trip to Skye with your own driver, built around your stops and priced before you pay.",
    metaTitle: "Isle of Skye Private Tours & Transfers | Cabslink",
    metaDescription: "Isle of Skye private tours and transfers with your own driver. Plan your route and stops in our custom tour planner and see the price before you pay.",
    breadcrumbLabel: "Isle of Skye Tours",
    serviceType: "Private driver tour",
    primaryTo: "/book/tour",
    sections: [
      { title: "Getting to Skye with a private driver", paragraphs: [
        "The Isle of Skye is a long way from Edinburgh and Glasgow, and the best of the island sits on single-track roads where a coach timetable leaves little time to stop. A private car lets you travel with only your own group and set your own pace.",
        "Our day-trips guide places Skye around 230 miles from Edinburgh and roughly eleven hours of driving for a return journey. The exact destination on the island, stops and traffic affect the time; the guide recommends two or three days rather than a rushed day return.",
        // TODO(owner): same-day Skye availability is not established by the published guide; do not promise it from the unapproved draft tour.
        "We do not run a ready-made Skye tour, so you plan the trip in the custom tour planner. Choose your start and finish, add the places on Skye you want to see, and see the best order before you apply it. When a trip cannot be priced instantly, request a quote and our team will reply.",
      ] },
      { title: "Breaking the journey", paragraphs: [
        "Our Harry Potter and Highlands tour page already offers multi-day trips on request, including the Isle of Skye. Each trip is quoted individually; send your dates, party size and planned stops so the team can review the itinerary.",
        "Most travellers split the drive. Our ready-made Highlands tours already cover Glencoe, Fort William and Glenfinnan, which sit on the way west, so you can see them on one day and continue another. Edinburgh to Fort William has its own route page with fixed prices.",
        "Tell us about luggage, walking needs and child seats when you book so we send a vehicle that suits a long day.",
      ] },
      { title: "Vehicles for longer trips", paragraphs: [
        FLEET + " Larger groups can book more than one vehicle on the same tour booking.",
      ] },
    ],
    links: [
      { label: "Highlands private tours", to: "/highlands-private-tours" },
      { label: "Edinburgh to Fort William", to: "/routes/edinburgh-to-fort-william" },
      { label: "All private tours", to: "/tours" },
      { label: "Long-distance transfers", to: "/long-distance-transfers" },
    ],
    faqs: [
      { q: "Do you have a ready-made Isle of Skye tour?", a: "Not yet. Plan your Skye trip in the custom tour planner, and request a quote if it cannot be priced instantly." },
      { q: "Can we stop on the way to Skye?", a: "Yes. Add Glencoe, Fort William or any other stop to your custom tour and the planner suggests the best order." },
      PRICE_FAQ,
    ],
  },

  "/st-andrews-golf-transfers": {
    path: "/st-andrews-golf-transfers",
    eyebrow: "St Andrews golf",
    h1: "St Andrews golf transfers with room for your clubs.",
    subtitle: "Private transfers from Edinburgh Airport, Glasgow and your hotel to St Andrews, with space for golf bags and a fixed price.",
    metaTitle: "St Andrews Golf Transfers | Room for Clubs | Cabslink",
    metaDescription: "St Andrews golf transfers from Edinburgh Airport and Glasgow. Vehicles with room for golf bags, flight tracking and a fixed price before you travel.",
    breadcrumbLabel: "St Andrews Golf Transfers",
    serviceType: "Golf transfer",
    primaryTo: "/book",
    sections: [
      { title: "From the airport to the first tee", paragraphs: [
        "St Andrews is about 48 miles from Edinburgh Airport over the Queensferry Crossing and the A91, roughly 80 minutes once golf bags are loaded. A pre-booked car means the clubs go straight in the boot and you go straight to your hotel or the course.",
        FLIGHT + " " + MEET,
      ] },
      { title: "Clubs, cases and the right vehicle", paragraphs: [
        "Golf trips need more boot space than people expect. Tell us how many golf bags you have when you book. " + FLEET,
        "For a group of four with full bags and cases, an MPV or the Eight-Seater Van is usually the comfortable choice.",
      ] },
      { title: "Multi-course trips", paragraphs: [
        "Many golfers combine St Andrews with Carnoustie or Gleneagles. Book each journey at once and every fixed price appears together, so the whole trip is costed before you travel. Edinburgh Airport to Gleneagles and Glasgow to St Andrews have their own route pages.",
      ] },
    ],
    links: [
      { label: "Edinburgh Airport to St Andrews", to: "/routes/edinburgh-airport-to-st-andrews" },
      { label: "Glasgow to St Andrews", to: "/routes/glasgow-to-st-andrews" },
      { label: "Edinburgh Airport to Gleneagles", to: "/routes/edinburgh-airport-to-gleneagles" },
      { label: "Golf transfers in Scotland", to: "/golf-transfers" },
    ],
    faqs: [
      { q: "Is there room for golf clubs?", a: "Yes. Tell us how many golf bags you have when you book and choose a vehicle with enough boot space." },
      { q: "How long is the drive from Edinburgh Airport to St Andrews?", a: "About 48 miles, roughly 80 minutes once bags are loaded." },
      PRICE_FAQ,
    ],
  },

  "/outlander-tours": {
    path: "/outlander-tours",
    eyebrow: "Outlander tours",
    h1: "Private Outlander tours from Edinburgh.",
    subtitle: "Visit Outlander filming locations such as Doune, Blackness, Culross and Falkland with your own driver and a set price per vehicle.",
    metaTitle: "Outlander Tours from Edinburgh | Private Driver | Cabslink",
    metaDescription: "Outlander tours from Edinburgh with a private driver: Lallybroch, Doune, Blackness, Culross and Falkland. Set price per vehicle, not per seat.",
    breadcrumbLabel: "Outlander Tours",
    serviceType: "Private driver tour",
    primaryTo: "/book/tour",
    tourSlugs: ["outlander-classic-highlights", "lallybroch-outlander-half-day", "outlander-castles-and-history", "edinburgh-castles-heritage-trail"],
    sections: [
      { title: "Outlander country, close to Edinburgh", paragraphs: [
        "Many of the best-known Outlander filming locations sit within easy reach of Edinburgh: Lallybroch, Blackness Castle, Doune Castle, the village of Culross and Falkland. A private tour lets your group see them at its own pace, with only your own party in the car.",
        "Our Outlander Classic Highlights tour covers Lallybroch, Blackness, Doune, Culross and Falkland in one day. The Lallybroch & Outlander Half Day covers three key locations in a shorter trip, and Outlander Castles & History adds more castles for history fans.",
      ] },
      { title: "Plan it your way", paragraphs: [
        "Each tour page shows its length and what the price covers, and prices are per vehicle, not per seat. Prefer a different mix? Use the custom tour planner to pick your own locations and see the best order before you apply it.",
        "Entry tickets to castles are not included unless the tour page says so; check each site's opening times before your day out.",
      ] },
      { title: "Vehicles for your group", paragraphs: [
        FLEET + " Larger fan groups can book more than one vehicle on the same tour.",
      ] },
    ],
    links: [
      { label: "All private tours", to: "/tours" },
      { label: "Highlands private tours", to: "/highlands-private-tours" },
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
      { label: "Book a custom tour", to: "/book/tour" },
    ],
    faqs: [
      { q: "Which Outlander locations can we visit?", a: "Our ready-made tours cover Lallybroch, Blackness Castle, Doune Castle, Culross and Falkland. You can choose other stops with the custom tour planner." },
      { q: "Is the price per person?", a: "No. Tour prices are per vehicle, so the whole group shares one price." },
      { q: "Are castle tickets included?", a: "Only when the tour page says so. Otherwise, entry is paid at each site." },
    ],
  },
};
