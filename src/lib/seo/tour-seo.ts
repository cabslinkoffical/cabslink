/**
 * SEO layer for tour pages (`/tours/:slug`).
 *
 * Why this exists: the tour *product* names in the CMS are editorial ("Lallybroch
 * & Outlander Half Day", "Photographer's Highland Lochs Day"). They are good
 * product names and stay as the product name and on-page H2 — but nobody
 * searches for them. This file holds the searched phrase used for the title
 * tag, the H1 and the meta description, keyed by tour slug.
 *
 * RULES:
 *  - One entry per published tour slug. `metaTitle` stays <= 60 characters so
 *    Google renders it whole; `metaDescription` sits in the 110-155 window.
 *  - Descriptions must be specific to the tour and lead with what the traveller
 *    gets. No shared boilerplate tail.
 *  - No prices anywhere in this file. Tour pricing is unresolved (see
 *    `DRAFT_TOURS` note) and must never be invented, estimated or derived.
 */

export type TourSeo = {
  /** On-page H1 and the phrase people actually search for. */
  h1: string;
  /** <title>, <= 60 chars. */
  metaTitle: string;
  /** Meta + og:description, 110-155 chars, specific to this tour. */
  metaDescription: string;
};

export const TOUR_SEO: Record<string, TourSeo> = {
  "outlander-classic-highlights": {
    h1: "Outlander Tours from Edinburgh",
    metaTitle: "Outlander Tours from Edinburgh | CabsLink",
    metaDescription:
      "Lallybroch, Blackness, Doune, Culross and Falkland in one day with your own driver. Filming locations in a sensible order, as long as you like at each.",
  },
  "lallybroch-outlander-half-day": {
    h1: "Outlander Half-Day Tour from Edinburgh",
    metaTitle: "Outlander Half-Day Tour from Edinburgh | CabsLink",
    metaDescription:
      "Three key Outlander filming locations in an afternoon, door to door from your Edinburgh address. The short version for a tight itinerary or an early flight.",
  },
  "outlander-castles-and-history": {
    h1: "Outlander Castle Tour from Edinburgh",
    metaTitle: "Outlander Castle Tour from Edinburgh | CabsLink",
    metaDescription:
      "Four castles behind the series in a single private day — the real history alongside the scenes, with your driver handling the roads and the parking.",
  },
  "highlands-escape-loch-lomond-trossachs": {
    h1: "Highland Day Tours from Edinburgh",
    metaTitle: "Highland Day Tours from Edinburgh | CabsLink",
    metaDescription:
      "The Kelpies, Stirling, Aberfoyle and Loch Lomond in one unhurried loop from Edinburgh. Your first taste of the Highlands without an overnight stay.",
  },
  "west-highland-grand-tour": {
    h1: "Scotland Tours from Edinburgh",
    metaTitle: "Scotland Tours from Edinburgh | CabsLink",
    metaDescription:
      "Loch Lomond, Glencoe, Fort William and Glenfinnan across one long West Highland day. The widest sweep of Scotland you can see and still sleep in Edinburgh.",
  },
  "glencoe-highlands-private-day": {
    h1: "Glencoe Tours from Edinburgh",
    metaTitle: "Glencoe Tours from Edinburgh | CabsLink",
    metaDescription:
      "Callander, Loch Lubnaig and the Three Sisters of Glencoe, with stops wherever the light is good. Around nine hours door to door from Edinburgh.",
  },
  "loch-lomond-trossachs-explorer": {
    h1: "Loch Lomond Tours from Edinburgh",
    metaTitle: "Loch Lomond Tours from Edinburgh | CabsLink",
    metaDescription:
      "A full day in Loch Lomond and the Trossachs National Park — lochside viewpoints, village stops and time to walk, at whatever pace suits you.",
  },
  "jacobite-legacy-glenfinnan-glencoe": {
    h1: "Glenfinnan Viaduct Tour from Edinburgh",
    metaTitle: "Glenfinnan Viaduct Tour from Edinburgh | CabsLink",
    metaDescription:
      "Glenfinnan Viaduct, Fort William and Glencoe in one long Jacobite day. We time the viaduct stop around the steam train where the timetable allows.",
  },
  "harry-potter-highland-expedition": {
    h1: "Harry Potter Tour from Edinburgh",
    metaTitle: "Harry Potter Tour from Edinburgh | CabsLink",
    metaDescription:
      "The Glenfinnan Viaduct, Glencoe and Fort William in one Highland day — the real filming country, with a driver who knows the viewing spots.",
  },
  "stirling-and-doune-castles-day": {
    h1: "Stirling Castle Tours from Edinburgh",
    metaTitle: "Stirling Castle Tours from Edinburgh | CabsLink",
    metaDescription:
      "Stirling Castle and Doune Castle in one private day, roughly an hour from Edinburgh. Enough time inside both without a coach party schedule.",
  },
  "edinburgh-castles-heritage-trail": {
    h1: "Castle Tours from Edinburgh",
    metaTitle: "Castle Tours from Edinburgh | CabsLink",
    metaDescription:
      "Four historic castles within easy reach of Edinburgh in one day — Forth-side fortresses and royal strongholds, with driving and parking handled.",
  },
  "braveheart-wallace-trail": {
    h1: "Braveheart & Wallace Tour from Edinburgh",
    metaTitle: "Braveheart & Wallace Tour from Edinburgh | CabsLink",
    metaDescription:
      "Follow William Wallace and Robert the Bruce across Stirling, Doune and Blackness — battlefield ground, the monument and the castles, in one day.",
  },
  "royal-palaces-of-scotland": {
    h1: "Royal Palaces Tour from Edinburgh",
    metaTitle: "Royal Palaces Tour from Edinburgh | CabsLink",
    metaDescription:
      "Linlithgow, Stirling and Falkland in a single private day — three Stewart palaces, the birthplaces and the tennis court, with time inside each.",
  },
  "trossachs-villages-discovery": {
    h1: "Trossachs Tours from Edinburgh",
    metaTitle: "Trossachs Tours from Edinburgh | CabsLink",
    metaDescription:
      "Callander, Aberfoyle and the quieter Trossachs villages at a slow pace — lochside coffee stops, short walks and no fixed turnaround time.",
  },
  "photographers-highland-lochs": {
    h1: "Highland Lochs Photography Tour from Edinburgh",
    metaTitle: "Highland Lochs Photo Tour from Edinburgh | CabsLink",
    metaDescription:
      "A day built around light rather than mileage: unhurried loch stops across the Trossachs, early starts on request and time to set up a tripod.",
  },
  "monty-python-movie-locations": {
    h1: "Doune Castle & Film Locations Tour from Edinburgh",
    metaTitle: "Doune Castle Film Tour from Edinburgh | CabsLink",
    metaDescription:
      "Doune Castle plus the Glencoe film viewpoints — the Holy Grail, Outlander and Game of Thrones locations in one private day from Edinburgh.",
  },
  "fife-coastal-heritage": {
    h1: "Fife Day Tour from Edinburgh — Culross & Falkland",
    metaTitle: "Fife Day Tour from Edinburgh: Culross | CabsLink",
    metaDescription:
      "Cobbled Culross, the royal palace at Falkland and the Fife coast at a relaxed pace — an easy day out across the Forth with your own driver.",
  },
  "kelpies-wheel-safari-family-day": {
    h1: "Family Day Tour from Edinburgh — Kelpies & Safari Park",
    metaTitle: "Family Day Tour: Kelpies & Safari | CabsLink",
    metaDescription:
      "The Kelpies, the Falkirk Wheel and Blair Drummond Safari Park in one family day — fitted child seats, short drives and boot space for the buggy.",
  },
  "safari-and-stirling-family-day": {
    h1: "Blair Drummond Safari Tour from Edinburgh",
    metaTitle: "Blair Drummond Safari Tour from Edinburgh | CabsLink",
    metaDescription:
      "Scotland's only safari park plus historic Stirling in one private day — around an hour each way, with fitted child seats and no timetable to catch.",
  },
  "falkirk-icons-half-day": {
    h1: "Kelpies & Falkirk Wheel Half-Day Tour from Edinburgh",
    metaTitle: "Kelpies & Falkirk Wheel Half-Day Tour | CabsLink",
    metaDescription:
      "The Kelpies, the Falkirk Wheel and two nearby royal castles in an afternoon — the best short day out from Edinburgh if you only have half a day.",
  },
  "forth-coast-bridges-kelpies": {
    h1: "Forth Bridges & Kelpies Tour from Edinburgh",
    metaTitle: "Forth Bridges & Kelpies Tour from Edinburgh | CabsLink",
    metaDescription:
      "The three Forth bridges, Blackness Castle, Culross and the Kelpies along the Forth shore — a day of big engineering and old harbours.",
  },
  "edinburgh-fort-william-scenic": {
    h1: "Edinburgh to Fort William Private Transfer",
    metaTitle: "Edinburgh to Fort William Private Transfer | CabsLink",
    metaDescription:
      "A one-way private transfer to Fort William through Loch Lomond and Glencoe, with photo stops on the way. Luggage in the boot, no coach changes.",
  },
};

export function tourSeo(slug: string): TourSeo | undefined {
  return TOUR_SEO[slug];
}

/* ------------------------------------------------------------------------- *
 * Code-defined draft tour pages
 *
 * Three tours with real search demand and no page yet. They are served from
 * code as `review` drafts: noindex, out of the sitemap, reachable only by
 * direct URL until the owner signs them off. Once approved they become CMS
 * templates with real stops.
 *
 * PRICING: deliberately absent. All tour pricing is unresolved and must not be
 * invented, estimated or derived — the pages say "price on request" and no
 * `Offer` schema is emitted until real figures are supplied and wired through
 * the same engine path the route pages use.
 * ------------------------------------------------------------------------- */

export type DraftTourSection = {
  heading: string;
  body: string[];
  bullets?: string[];
  /** Internal links rendered as chips under the section. */
  links?: { label: string; to: string }[];
};

export type DraftTourRecord = {
  slug: string;
  /** Always true for now — gates noindex and sitemap exclusion. */
  review: true;
  eyebrow: string;
  /** Product name, shown as the on-page H2. */
  productName: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  /** Lead paragraphs. The honest caveat belongs here, not buried. */
  intro: string[];
  facts: { label: string; value: string }[];
  sections: DraftTourSection[];
  faqs: { q: string; a: string }[];
  related: { label: string; to: string }[];
};

/** The twelve distillery pages, linked from the whisky tour page. */
const DISTILLERY_LINKS: { label: string; to: string }[] = [
  { label: "Glenkinchie", to: "/distilleries/glenkinchie" },
  { label: "Auchentoshan", to: "/distilleries/auchentoshan" },
  { label: "Aberlour", to: "/distilleries/aberlour" },
  { label: "The Glenlivet", to: "/distilleries/glenlivet" },
  { label: "Glenfiddich", to: "/distilleries/glenfiddich" },
  { label: "The Macallan", to: "/distilleries/the-macallan" },
  { label: "Glenmorangie", to: "/distilleries/glenmorangie" },
  { label: "Dalmore", to: "/distilleries/dalmore" },
  { label: "Oban", to: "/distilleries/oban-distillery" },
  { label: "Bowmore", to: "/distilleries/bowmore" },
  { label: "Ardbeg", to: "/distilleries/ardbeg" },
  { label: "Laphroaig", to: "/distilleries/laphroaig" },
];

export const DRAFT_TOURS: DraftTourRecord[] = [
  {
    slug: "isle-of-skye-from-edinburgh",
    review: true,
    eyebrow: "Private Driver Tour",
    productName: "Isle of Skye Private Journey",
    h1: "Isle of Skye Tours from Edinburgh",
    metaTitle: "Isle of Skye Tours from Edinburgh | CabsLink",
    metaDescription:
      "Skye is around five hours each way from Edinburgh. We drive it as a two-day trip so you actually see the island, and explain why one day rarely works.",
    intro: [
      "Skye sits roughly 230 miles from Edinburgh by road — about five hours of driving each way, and that is on a good day with no coach traffic on the A82 or roadworks at Glen Shiel.",
      "We will drive it in a single day if that is genuinely all the time you have. But you should know what that day looks like: leaving Edinburgh before 06:00, ten hours in the car, and something like two or three hours on the island before you have to turn round. Most people arrive back at midnight remembering the motorway rather than the Quiraing.",
      "The honest answer is two days, with a night on Skye or in Kyle of Lochalsh. Same driver, same car, and the second morning is when the island actually opens up — Sligachan, the Quiraing and Neist Point without watching the clock.",
    ],
    facts: [
      { label: "Distance from Edinburgh", value: "~230 miles each way" },
      { label: "Driving time", value: "~5 hours each way" },
      { label: "Recommended", value: "Two days, one overnight" },
      { label: "Single-day version", value: "Possible, 18+ hour day" },
    ],
    sections: [
      {
        heading: "Why we recommend the two-day version",
        body: [
          "The drive north is not dead time — it goes through Loch Lomond, Rannoch Moor, Glencoe and Glen Shiel, which is some of the best road in Europe. Compressing it into a return day trip means driving most of it in the dark on the way back.",
          "With an overnight you get two shorter driving days, the Skye Bridge in daylight both ways, and the flexibility to sit out a rainy morning and go up the Quiraing when it clears.",
        ],
        bullets: [
          "Day one: Edinburgh, Loch Lomond, Glencoe, Eilean Donan, over the bridge to Portree",
          "Day two: Old Man of Storr, the Quiraing, Sligachan or Neist Point, then south",
          "Your driver's accommodation is arranged separately and appears on the quote",
        ],
      },
      {
        heading: "If it has to be one day",
        body: [
          "We will do it, and we will say plainly what gets cut. A single day realistically buys you Eilean Donan Castle, the Skye Bridge, Sligachan and a stop at the Old Man of Storr viewpoint. The Quiraing, Neist Point and Talisker do not fit.",
          "A better one-day alternative for many people is Glencoe and Glenfinnan, which sits at the same latitude of drama with three fewer hours in the car.",
        ],
      },
      {
        heading: "What the private option changes",
        body: [
          "There is no realistic public-transport day trip to Skye from Edinburgh and back. Scheduled coaches to Portree involve a change and most of the day, and the last service back does not permit a return the same day.",
          "A private car means door-to-door pickup, stops where you want them rather than at fixed comfort breaks, luggage for an overnight, and fitted child seats on request.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can you do Isle of Skye from Edinburgh in one day?",
        a: "Physically yes, comfortably no. It is around five hours' driving each way, so a return day trip means an 18-hour day with roughly two to three hours on the island. We will run it if that is your only option, but we recommend two days with one overnight.",
      },
      {
        q: "How far is Skye from Edinburgh?",
        a: "About 230 miles by road to the Skye Bridge and Portree, via Loch Lomond, Glencoe and Glen Shiel — typically five hours of driving each way without stops.",
      },
      {
        q: "What does the two-day version include?",
        a: "The same driver and car for both days, an overnight on Skye or near Kyle of Lochalsh, and an itinerary built around the weather. Accommodation for your driver is quoted separately and shown before you book.",
      },
      {
        q: "How much does it cost?",
        a: "We quote each Skye trip individually because the mileage, hours and overnight arrangements vary. Send us your dates and group size and we will price it — we do not publish an estimate we would have to revise.",
      },
    ],
    related: [
      { label: "Isle of Skye", to: "/attractions/isle-of-skye" },
      { label: "Glencoe day tour", to: "/tours/glencoe-highlands-private-day" },
      { label: "West Highland grand tour", to: "/tours/west-highland-grand-tour" },
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
    ],
  },
  {
    slug: "loch-ness-from-edinburgh",
    review: true,
    eyebrow: "Private Driver Tour",
    productName: "Loch Ness & Great Glen Private Day",
    h1: "Loch Ness Tours from Edinburgh",
    metaTitle: "Loch Ness Tours from Edinburgh | CabsLink",
    metaDescription:
      "Urquhart Castle, the loch shore and an optional cruise, driven door to door from Edinburgh. Around 11 hours in total — here is the honest timing.",
    intro: [
      "Loch Ness is about 165 miles from Edinburgh to Urquhart Castle, which is three and a half hours of driving each way through Perthshire, Drumochter and the Great Glen.",
      "That makes it a long but genuinely workable day: leave around 07:30, reach the loch by late morning, and you have four or five hours at the water before the drive south. Expect to be back in Edinburgh around 19:00 to 20:00 — call it eleven to twelve hours door to door.",
      "It is the classic Highland day for a reason. The road up the A9 and down the Great Glen is beautiful, and Urquhart Castle on its promontory earns the trip on its own.",
    ],
    facts: [
      { label: "Distance from Edinburgh", value: "~165 miles each way" },
      { label: "Driving time", value: "~3h 30m each way" },
      { label: "Total day", value: "11-12 hours door to door" },
      { label: "Time at the loch", value: "4-5 hours" },
    ],
    sections: [
      {
        heading: "What the day covers",
        body: [
          "The standard shape is a comfort stop in Perthshire, Urquhart Castle for the ruins and the loch view, lunch in Drumnadrochit or Fort Augustus, and a run along the loch shore before heading home.",
          "If you would rather trade a stop for time on the water, we can build the day around a cruise departure instead.",
        ],
        bullets: [
          "Urquhart Castle — Historic Environment Scotland site, admission payable on the day",
          "Drumnadrochit for lunch and the loch exhibitions",
          "Fort Augustus and the Caledonian Canal locks",
          "Optional: the Great Glen viewpoints on the quieter east shore",
        ],
      },
      {
        heading: "The cruise option",
        body: [
          "Boat trips run on the loch from Clansman Harbour and Dochgarroch, north of Urquhart Castle, with sailings through the day in season and a reduced winter timetable. Most last around an hour, and several pass or stop at the castle.",
          "We do not publish cruise fares here because operators change them by season and by sailing. Tell us if you want a cruise and we will time the drive around a specific departure so you are not standing on the pier watching it leave — you book the tickets directly, or we can arrange them as an extra.",
        ],
      },
      {
        heading: "Is it better than the coach?",
        body: [
          "Scheduled coach day tours to Loch Ness do exist from Edinburgh and they are cheaper per seat if you are travelling alone. What you give up is the pickup at your door, the choice of stops, and the ability to leave when you have seen enough.",
          "For two or more people, once you count the fares, the private car usually stops looking like a luxury — and for families needing fitted child seats it is often the only workable option.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does it take to drive from Edinburgh to Loch Ness?",
        a: "Around three and a half hours each way to Urquhart Castle, roughly 165 miles via the A9 and the Great Glen. With stops, lunch and time at the loch, the full day runs eleven to twelve hours door to door.",
      },
      {
        q: "Can I do a Loch Ness cruise on the same day?",
        a: "Yes. Sailings run from Clansman Harbour and Dochgarroch through the day in season, most lasting about an hour. We time the drive around a specific departure. Fares vary by operator and season, so we do not quote them here.",
      },
      {
        q: "Do I pay to get into Urquhart Castle?",
        a: "Yes — it is a Historic Environment Scotland site with its own admission charge, paid on the day or with an Explorer Pass. It is not included in the driving quote.",
      },
      {
        q: "Can you combine Loch Ness with anything else?",
        a: "Realistically only light additions on the way — Dunkeld, Pitlochry or the Drumochter pass viewpoints. Adding Glencoe or Skye to the same day does not work; those belong to their own itineraries.",
      },
    ],
    related: [
      { label: "Loch Ness", to: "/attractions/loch-ness" },
      { label: "Glencoe day tour", to: "/tours/glencoe-highlands-private-day" },
      { label: "Highland day tours", to: "/tours/highlands-escape-loch-lomond-trossachs" },
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
    ],
  },
  {
    slug: "whisky-distillery-tours-from-edinburgh",
    review: true,
    eyebrow: "Private Driver Tour",
    productName: "Private Whisky Distillery Day",
    h1: "Whisky Tours from Edinburgh",
    metaTitle: "Whisky Tours from Edinburgh | CabsLink",
    metaDescription:
      "Your driver is the designated driver, so everyone in the car can taste. Two or three distilleries in a day, booked around real tour and tasting times.",
    intro: [
      "The whole point of a private driver on a whisky day is this: the driver is the designated driver, so every single person in the car gets to drink. Nobody nurses a dram they have to hand over, nobody is counting units on the way home, and nobody is driving a rural A-road after a tasting flight.",
      "We build the day around distillery tour times rather than around mileage. Two distilleries is a comfortable day, three is possible if they are close together, and four is a mistake — tours run 60 to 90 minutes and the roads between the good ones are not fast.",
      "You book the distillery tours and tastings directly, or we can arrange them as an extra. Either way the driving, parking and timing are ours to worry about.",
    ],
    facts: [
      { label: "Realistic per day", value: "Two, sometimes three distilleries" },
      { label: "Nearest to Edinburgh", value: "Glenkinchie, ~30 minutes" },
      { label: "Tastings", value: "Everyone drinks — the driver doesn't" },
      { label: "Speyside as a day trip", value: "Long; better as two days" },
    ],
    sections: [
      {
        heading: "Which distilleries work from Edinburgh",
        body: [
          "Glenkinchie is the obvious anchor — it is the Lowland malt on Edinburgh's doorstep, around half an hour out into East Lothian, which leaves most of the day free for a second visit or a castle.",
          "Auchentoshan sits on the other side of the central belt near Glasgow, so the two Lowland distilleries pair into an easy day. Speyside — Aberlour, The Glenlivet, Glenfiddich, The Macallan — is three hours plus each way and works far better as an overnight than a sprint.",
          "The Islay names, Ardbeg, Laphroaig and Bowmore, involve a ferry and are not day trips from Edinburgh in any honest sense. We will drive you to Kennacraig and arrange the crossing, but plan two or three days.",
        ],
        links: DISTILLERY_LINKS,
      },
      {
        heading: "How the day is timed",
        body: [
          "Distillery tours are ticketed and they sell out, especially the warehouse and cask tastings. We work backwards from the slot you have booked: pickup time, drive, arrival with fifteen minutes spare, and a lunch stop that is not a service station.",
          "If you have not booked yet, tell us which distilleries you want and we will tell you honestly which combinations fit in one day and which do not.",
        ],
      },
      {
        heading: "Practical things worth knowing",
        body: [
          "Most distilleries offer a drivers' dram to take away, which is irrelevant here — that is the point of booking a driver. Bottles you buy travel in the boot, and we will stop at a shop if you want packing material for flights.",
          "Groups: we can take a small group in one vehicle rather than splitting across cars, which keeps the day social. Tell us the number when you enquire.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can everyone drink on a private whisky tour?",
        a: "Yes. Your driver does not taste, so every passenger can. That is the single biggest reason to book a private car for a distillery day rather than driving yourselves.",
      },
      {
        q: "How many distilleries can you visit in a day from Edinburgh?",
        a: "Two comfortably, three if they are geographically close. Tours run 60 to 90 minutes each and the roads between distilleries are rarely quick, so a four-stop day means rushing all four.",
      },
      {
        q: "Which distillery is closest to Edinburgh?",
        a: "Glenkinchie, about thirty minutes into East Lothian. It is the Lowland malt most often paired with a second stop or a castle in the same day.",
      },
      {
        q: "Can you do Speyside or Islay in a day?",
        a: "Speyside is three hours or more each way — possible, but you will spend most of the day in the car, so we recommend an overnight. Islay needs a ferry and realistically two to three days.",
      },
      {
        q: "Do you book the distillery tours?",
        a: "You can book them yourself, or we can arrange them as an extra on your quote. Distillery admission and tasting fees are never included in the driving price.",
      },
    ],
    related: [
      { label: "All distillery pages", to: "/distilleries" },
      ...DISTILLERY_LINKS.slice(0, 4),
      { label: "Day trips from Edinburgh", to: "/guides/day-trips-from-edinburgh" },
    ],
  },
];

export function draftTour(slug: string): DraftTourRecord | undefined {
  return DRAFT_TOURS.find((t) => t.slug === slug);
}

/** Slugs served from code rather than the CMS. Never added to the sitemap. */
export const DRAFT_TOUR_SLUGS = DRAFT_TOURS.map((t) => t.slug);
