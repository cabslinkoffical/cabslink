/**
 * Extra editorial sections and FAQs for individual tour pages, keyed by tour
 * slug. Rendered by /tours/:slug below the tour description; FAQs here are
 * merged with the CMS FAQs and included in the page's FAQPage schema.
 *
 * Rules: factual only, no prices (prices come from tour settings), and never
 * claim an official, licensed or endorsed connection to any film or brand.
 * `{hours}` in any text is replaced with the tour's configured duration.
 */

export type TourExtraSection = {
  heading: string;
  body: string[];
  /** Optional titled points, rendered as a list under the body. */
  points?: { title: string; text: string }[];
};

export type TourExtras = {
  sections: TourExtraSection[];
  faqs: { q: string; a: string }[];
};

export const TOUR_EXTRAS: Record<string, TourExtras> = {
  "harry-potter-highland-expedition": {
    sections: [
      {
        heading: "Harry Potter filming locations you'll see",
        body: [
          "This is a private day in your own vehicle through the Highland landscapes that appear in the Harry Potter films. Your driver plans the order of stops and the viewpoints, so you spend the day looking at the places rather than finding them.",
        ],
        points: [
          {
            title: "Glenfinnan Viaduct",
            text: "The curved 21-arch railway viaduct the Hogwarts Express crosses in the films. You can walk up to the viewpoint above it, or see it from below at the Glenfinnan visitor centre.",
          },
          {
            title: "Glencoe",
            text: "The mountains and glen around the setting of Hagrid's hut in Harry Potter and the Prisoner of Azkaban. Your driver stops at the Three Sisters viewpoints along the A82.",
          },
          {
            title: "Loch Shiel",
            text: "The long loch stretching away from Glenfinnan, seen from the same viewpoint as the viaduct and the Glenfinnan Monument.",
          },
          {
            title: "The drive through the Highlands",
            text: "The road north crosses Rannoch Moor into Glencoe and on to Fort William, with photo stops wherever you want them. The drive itself is a large part of the day.",
          },
          {
            title: "Edinburgh's Harry Potter links (on request)",
            text: "We can add a stop in Edinburgh before or after the Highlands, such as Victoria Street, often linked with Diagon Alley, or Greyfriars Kirkyard, where some gravestone names are associated with the books. Just ask when you book.",
          },
        ],
      },
      {
        heading: "Seeing the Jacobite steam train",
        body: [
          "The Jacobite steam train crosses the Glenfinnan Viaduct on the West Highland Line between Fort William and Mallaig. It is a seasonal service and does not run every day of the year.",
          "Where the timetable allows, we time the viaduct stop so you are at the viewpoint when the train crosses. We confirm the timings with you when you book, and if the train is not running on your date we tell you before you travel.",
        ],
      },
      {
        heading: "Want 2-4 days?",
        body: [
          "Multi-day Harry Potter and Highlands trips are available on request, with time for Fort William, Glenfinnan, Mallaig and the Isle of Skye at a gentler pace. Each multi-day trip is quoted individually, so tell us your dates and what you want to see.",
        ],
      },
    ],
    faqs: [
      {
        q: "How long is the Harry Potter tour from Edinburgh?",
        a: "The tour is booked as a {hours}-hour private day, starting and finishing at your Edinburgh pickup address. Most of the time is spent in the Highlands at Glencoe, Glenfinnan and Fort William.",
      },
      {
        q: "Will we see the Hogwarts Express?",
        a: "The Jacobite steam train used as the Hogwarts Express is seasonal. Where the timetable allows, we time the Glenfinnan Viaduct stop for the crossing and confirm the timings when you book. You will see the viaduct either way.",
      },
      {
        q: "Is it a private tour?",
        a: "Yes. The vehicle and driver are yours for the day, with no other passengers, and you can take as long as you like at each stop within the hours booked.",
      },
      {
        q: "How many people can come?",
        a: "From 1 to 8 guests. You choose a vehicle that fits your group when you book, and the price is per vehicle, not per person.",
      },
      {
        q: "Can you pick us up from our hotel?",
        a: "Yes. Pickup is door to door from your hotel or any other address in Edinburgh, and you are dropped back there at the end of the day.",
      },
      {
        q: "Can we do it as a multi-day trip?",
        a: "Yes, on request. We can plan 2 to 4 days covering Fort William, Glenfinnan, Mallaig and the Isle of Skye, quoted per trip. Contact us with your dates.",
      },
    ],
  },
};

export function tourExtras(slug: string, hours: number | null | undefined): TourExtras | undefined {
  const x = TOUR_EXTRAS[slug];
  if (!x) return undefined;
  const h = hours != null ? String(hours) : "full";
  const fill = (s: string) => s.replace(/\{hours\}/g, h);
  return {
    sections: x.sections.map((s) => ({
      heading: fill(s.heading),
      body: s.body.map(fill),
      points: s.points?.map((p) => ({ title: fill(p.title), text: fill(p.text) })),
    })),
    faqs: x.faqs.map((f) => ({ q: fill(f.q), a: fill(f.a) })),
  };
}
