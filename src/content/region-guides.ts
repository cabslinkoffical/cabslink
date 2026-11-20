/** Reviewed against active destinations on 20 November 2026. No wider coverage is inferred. */
import { estimateDrive, fmtMins, MAIN_AIRPORTS } from "@/lib/drive-estimate";
import { FACT_TEXT } from "@/lib/site-facts";

type Place = { slug: string; name: string; display_name: string | null; lat: number | null; lng: number | null };
type Guide = { paragraphs: string[]; faqs: { q: string; a: string }[]; updatedAt: string };
const CENTRES = [
  { name: "Edinburgh city centre", lat: 55.9533, lng: -3.1883 },
  { name: "Glasgow city centre", lat: 55.8609, lng: -4.2514 },
] as const;

function travel(p: Place): string {
  if (p.lat == null || p.lng == null) return "Journey estimates are unavailable until the pickup coordinates are confirmed.";
  return `${p.name}: ${[...MAIN_AIRPORTS, ...CENTRES].map((target) => {
    const d = estimateDrive(p.lat as number, p.lng as number, target);
    return `${target.name} about ${fmtMins(d.mins)} (${d.miles} miles)`;
  }).join("; ")}.`;
}

/** Exact required places prevent a stale guide being shown against unrelated or removed rows. */
export function regionGuide(name: string, places: Place[]): Guide | null {
  const get = (slug: string) => places.find((p) => p.slug === slug);
  const updatedAt = "2026-11-20T12:07:00Z"; // Significant editorial revision, not generation time.
  if (name === "Fife") {
    const dunfermline = get("dunfermline"), kirkcaldy = get("kirkcaldy"), andrews = get("st-andrews"), university = get("university-of-st-andrews");
    if (!dunfermline || !kirkcaldy || !andrews || !university) return null;
    return { updatedAt, paragraphs: [
      "Our Fife directory covers Dunfermline, Kirkcaldy, St Andrews and the University of St Andrews. Dunfermline sits on the western side of the county, Kirkcaldy is on the Firth of Forth coast, and St Andrews is farther east. Start with the town page that matches your accommodation, then enter the actual street or hotel for a transfer quote. Glenrothes, Cupar and Leven are not separate entries in this directory, and we do not list a Rosyth cruise-port transfer here.",
      "For Edinburgh Airport, the starting town matters. Dunfermline is the nearer of our three Fife towns; St Andrews needs a longer cross-county journey. Glasgow Airport is a different transfer, not an extension of the Edinburgh fare. These planning figures use each place's coordinates, a road-distance allowance and an average driving speed of 65 km/h. They are not measured traffic predictions. The booking quote uses the routed journey instead.",
      `${travel(dunfermline)} ${travel(kirkcaldy)} ${travel(andrews)} Allow additional time for the airport check-in deadline and for traffic around the Forth crossings; the figures above cover driving only, not the time needed inside a terminal.`,
      "St Andrews bookings can be for golf travel as well as an airport run. Give us the golf venue and tee time rather than just the town name, and include golf bags with the luggage details. A hotel arrival in St Andrews and a pickup after a round are different addresses, so add the planned stops or return journey to the booking. For university arrivals and departures, use the University of St Andrews entry with the residence or building address. Term luggage can take more room than a short holiday suitcase.",
      `For families travelling from Kirkcaldy or Dunfermline, select child seats when booking and choose the vehicle against both passengers and bags. Fife transfers can be pre-booked for early or late flights, with the service available 24/7; do not rely on finding a car after arrival. ${FACT_TEXT.feesIncluded} ${FACT_TEXT.meetGreet} On a St Andrews return, keep the pickup notes specific to the hotel, course or university entrance so the driver is not sent to a general town-centre point.`,
    ], faqs: [
      { q: "Which Fife towns have transfer pages?", a: "Dunfermline, Kirkcaldy and St Andrews have town pages, with a separate University of St Andrews page. Rosyth, Cupar, Leven and Glenrothes are not listed as individual destinations here." },
      { q: "How long should I allow from St Andrews to the Scottish airports?", a: `${travel(andrews)} These coordinate-based planning estimates exclude check-in and traffic delays; the quote uses the actual route.` },
      { q: "Can I include golf bags on a St Andrews transfer?", a: "Yes. Enter the course or hotel address and include golf bags in the luggage details when choosing your vehicle. Add the return or any other planned stops before confirming the price." },
      { q: "What pickup address should a St Andrews student use?", a: "Use the University of St Andrews destination and give the actual residence or building entrance. Include term-time suitcases in the bag count rather than using the university name alone as the meeting point." },
    ] };
  }
  if (name === "Argyll") {
    const oban = get("oban");
    if (!oban) return null;
    return { updatedAt, paragraphs: [
      "Oban is the only active destination assigned to Argyll in our directory. This guide therefore describes a pre-booked transfer to or from Oban, not a network of local pickups throughout the whole county. Inveraray, Lochgilphead, Dunoon and Helensburgh do not have entries under Argyll here. If your journey ends somewhere else, give the exact address for a quote rather than treating the Oban price or driving time as a county-wide figure. Argyll's coastline and sea lochs make that distinction particularly important.",
      "An Oban airport transfer is a substantial mainland drive. Edinburgh Airport and Glasgow Airport are separate destinations, and neither should be booked simply as 'the airport'. The same applies to city drop-offs: an Edinburgh hotel and a Glasgow railway connection need their own addresses. Our planning calculation uses Oban's saved coordinates, a road-distance allowance of 30 per cent and an average speed of 65 km/h. It does not account for a particular day's roadworks or congestion on the approach to either city.",
      `${travel(oban)} These are mainland driving estimates, not ferry-inclusive timings. Leave a margin between the estimated arrival and a flight, train or sailing deadline. The confirmed quote is based on the routed pickup and destination, which may differ from the town reference point used here.`,
      "Oban can be the mainland handover point for an island journey. Enter the particular ferry terminal or accommodation as your destination, and check the sailing with the ferry operator before booking the car. Do not use the Oban road estimate for an Islay connection: Islay ferry links require their own port, sailing and onward arrangements, and no Islay port or whisky distillery is listed in this Argyll group. A distillery visit elsewhere in Argyll likewise needs its actual venue, rather than an assumed stop on the Oban transfer.",
      `For an onward rail journey on the Oban branch of the West Highland line, supply the station entrance and train departure time. The directory has an Oban town page, not a separate station entry, so the address matters. Overnight airport departures can be pre-booked with our 24/7 service. Families should add the required child seats; ferry travellers should count every suitcase before choosing the vehicle. ${FACT_TEXT.feesIncluded} ${FACT_TEXT.meetGreet} If the ferry or rail leg changes, contact us about the car booking rather than assuming its pickup time changes automatically.`,
    ], faqs: [
      { q: "Which Argyll places are listed for transfers?", a: "Oban is the only active Argyll destination in this directory. Inveraray, Lochgilphead, Dunoon and Helensburgh are not separate listed entries in the Argyll group." },
      { q: "How long is Oban to Edinburgh or Glasgow?", a: `${travel(oban)} These figures use coordinates and an average speed, not live traffic or a ferry timetable.` },
      { q: "Does an Oban transfer include travel to Islay?", a: "No island leg is implied by an Oban booking. Specify the ferry port and check the sailing separately. This Argyll directory contains no Islay ferry-port or distillery entry." },
      { q: "Can the Oban pickup connect with the West Highland line?", a: "Enter the actual Oban station entrance and train time as your journey details. The listed destination is the town, so use an exact station address rather than a general Oban pickup." },
    ] };
  }
  if (name === "Lowland") {
    const auch = get("auchentoshan"), glen = get("glenkinchie");
    if (!auch || !glen) return null;
    return { updatedAt, paragraphs: [
      "Lowland is a whisky-region grouping in this directory, not a list of all towns in southern Scotland. Its two active entries are Auchentoshan Distillery at Clydebank and Glenkinchie Distillery at Pencaitland. Ayr, Dumfries and the Borders towns are not assigned to this Lowland group. Use the individual distillery page for a visit, rather than interpreting the regional heading as coverage of every Lowland town. The two venues are on opposite sides of Scotland's central belt and need separate journey plans.",
      "Auchentoshan is the western destination, on the Clydebank side of Glasgow. Glenkinchie is the eastern destination near Pencaitland in East Lothian. A Glasgow pickup followed by Auchentoshan differs from an Edinburgh pickup followed by Glenkinchie. If you want to visit both on the same day, put both venues into the itinerary before asking for a price. A direct airport-to-distillery estimate excludes the leg between them, time at either venue and a return to your accommodation.",
      `${travel(auch)} ${travel(glen)} The figures use the saved distillery coordinates, a 30 per cent allowance over straight-line distance and a 65 km/h average speed. They are planning estimates rather than cached measured routes; the quote calculates the actual journey. Check the distillery's booked arrival time separately and allow a margin for city traffic.`,
      "For a whisky visit, confirm your tour or tasting with Auchentoshan or Glenkinchie directly, then arrange transport around that appointment. A car booking is not an admission ticket and does not reserve a tasting space. Give us the entrance named in the venue's joining instructions, especially if your party is arriving from an airport with luggage. For a return after the visit, add the return journey or planned stops so the quote reflects your whole transport plan rather than just the outward leg.",
      `These two Lowland pages do not establish hospital, university, golf or cruise-port coverage within this group: none of those destination types is assigned here. Airport connections and distillery visits are the journeys this particular directory can describe from its own data. Our 24/7 transfer service permits early or late travel, but distillery opening hours remain the venue's own arrangements. Choose a vehicle for the passengers and suitcases, and select child seats if needed. ${FACT_TEXT.feesIncluded} ${FACT_TEXT.meetGreet} A Glasgow arrival should be paired with the correct western or eastern distillery, not just the label 'Lowland'.`,
    ], faqs: [
      { q: "Does Lowland include Ayr, Dumfries or the Borders here?", a: "No. This directory's Lowland group consists of Auchentoshan Distillery at Clydebank and Glenkinchie Distillery at Pencaitland. It is a whisky-region grouping rather than a southern-Scotland town directory." },
      { q: "Which Scottish airport is nearer Auchentoshan?", a: `${travel(auch)} These are estimated drives from the saved distillery coordinates; use an actual airport and entrance address in the quote.` },
      { q: "How does Glenkinchie compare for an Edinburgh pickup?", a: `${travel(glen)} Glenkinchie is the Pencaitland destination in this group, distinct from Auchentoshan at Clydebank.` },
      { q: "Does booking a Lowland distillery transfer reserve a tasting?", a: "No. Reserve the visit with Auchentoshan or Glenkinchie separately, then give us its arrival time and entrance. Add both venues and a return if that is the itinerary you need priced." },
    ] };
  }
  if (name === "England") {
    const newcastle = get("newcastle-airport"), manchester = get("manchester-airport"), birmingham = get("birmingham-airport");
    if (!newcastle || !manchester || !birmingham) return null;
    const airports = places.filter((p) => p.slug.endsWith("-airport")).map((p) => p.name);
    return { updatedAt, paragraphs: [
      `Our England directory is for long-distance transfers between Scotland and listed English airports, not an English local taxi service. Its airport entries are ${airports.join(", ")}. The towns shown beside them identify each airport's location; they are not separate city-transfer entries in this region. Choose the actual terminal airport as your destination rather than selecting Manchester when you mean a city-centre hotel, or London when you mean a particular London airport.`,
      "Newcastle is the northernmost entry. Luton and Stansted are separate airports north of London; Heathrow, Gatwick and London City are different arrivals again. Leeds Bradford, Liverpool and East Midlands cannot be substituted in a booking. For Bristol or Southampton, allow for the longer drive as well as check-in.",
      `${travel(newcastle)} ${travel(manchester)} ${travel(birmingham)} These comparison figures come from saved airport coordinates, with a 30 per cent road-distance allowance and an average speed of 65 km/h. They are estimates, not measured route durations or guaranteed arrival times. The quote calculates the actual road journey; stops, heavy traffic and rest breaks require additional time.`,
      "These journeys suit a Scottish stay where the flight uses an English airport, or a group with luggage needing direct transport. They are not local English airport runs. Give both ends, the terminal and the departure deadline before confirming. Enter any stop on the way to Scotland before booking so the fixed price covers it.",
      `On a Manchester, Birmingham or London-airport pickup, count all suitcases as well as passengers before selecting the vehicle. Child seats can be chosen when booking; a long journey is not a reason to leave them until pickup. The transfer service is available for pre-booked travel 24/7, which is useful for flight timings but does not remove the need to plan the drive. ${FACT_TEXT.feesIncluded} ${FACT_TEXT.meetGreet} For a return from Edinburgh or Glasgow, specify the English airport again and allow enough time for its terminal formalities.`,
    ], faqs: [
      { q: "Are these England pages for local English taxi journeys?", a: "This region guide describes long-distance transfers to or from Scotland. Its listed places are airports, not a separate network of English city-centre pickup pages." },
      { q: "How long is Newcastle Airport to Edinburgh and Glasgow?", a: `${travel(newcastle)} Allow separately for breaks and traffic; the quote uses the routed journey.` },
      { q: "How does Manchester Airport compare with Birmingham Airport?", a: `${travel(manchester)} ${travel(birmingham)} The estimates use each airport's coordinates, not its city centre.` },
      { q: "Can I book the same London pickup for Heathrow, Luton and Stansted?", a: "No. Those are distinct airport entries. Select the airport shown on your flight booking and add the terminal or meeting details so the Scotland transfer is priced from the correct place." },
    ] };
  }
  if (name === "Wales") {
    const cardiff = get("cardiff-airport");
    if (!cardiff) return null;
    return { updatedAt, paragraphs: [
      "Cardiff Airport is the only active Welsh destination in our directory. Our Wales page therefore covers a long-distance private transfer between that airport and Scotland, not local taxi coverage across Wales. There is no separate Cardiff city-centre entry in this group, and no listed Welsh station, hospital, university, cruise port or attraction. If the address you need is not Cardiff Airport, give it explicitly for a quote rather than assuming the airport's distance or fare also applies to the whole Cardiff area.",
      "A Cardiff Airport booking should identify the airport as the Welsh end of the journey and the actual Scottish address at the other end. Edinburgh Airport, Glasgow Airport, Edinburgh city centre and Glasgow city centre are four different destinations. The city-centre reference points below are only for comparison; a hotel or home outside the centre can alter the drive. For a Scotland departure using a Cardiff flight, work backwards from the airline's check-in deadline, not just the departure printed on the ticket.",
      `${travel(cardiff)} These are coordinate-based planning estimates. We allow 30 per cent above straight-line distance for the road journey and use an average speed of 65 km/h. That method gives a comparison, not a measured Cardiff-to-Scotland route or a live traffic prediction. Rest breaks, congestion and airport formalities are outside the figures. The booking quote uses the actual routed pickup and destination before showing the fixed price.`,
      "This is a long overland transfer, so it is worth comparing the whole journey with your other travel arrangements before booking. A Cardiff Airport arrival followed by a Scottish hotel stay can be entered as one private transfer; a later return needs its own date and pickup time in the return fields. Include any requested intermediate stop in the plan before confirming. We do not attach Welsh sightseeing stops, golf courses or distillery visits to this guide because none is present in its destination data.",
      `For a family or small group arriving at Cardiff Airport, choose the vehicle against both the passenger count and the luggage carried all the way to Scotland. Add the child seats needed for that journey rather than expecting them to be supplied without selection. Pre-booked transfers are available 24/7, but an overnight flight connection still needs enough driving and check-in time. ${FACT_TEXT.feesIncluded} ${FACT_TEXT.meetGreet} Give the Cardiff flight and terminal details you have, and keep the Scottish hotel or home address precise. This page offers a Cardiff Airport connection, not a promise of a car waiting at every Welsh location.`,
    ], faqs: [
      { q: "Which Welsh destinations are listed?", a: "Cardiff Airport is the only active entry assigned to Wales. This group has no separate Welsh city, station, university, hospital, attraction or cruise-port page." },
      { q: "How long is Cardiff Airport to Scotland?", a: `${travel(cardiff)} These are coordinate-based estimates for driving only, excluding breaks, congestion and check-in.` },
      { q: "Is the Cardiff Airport estimate also a Cardiff city-centre fare?", a: "No. The saved coordinates identify the airport, not the city centre. Enter the actual Welsh pickup and Scottish destination to obtain a routed fixed-price quote." },
      { q: "Can I add a return from Scotland to Cardiff Airport?", a: "Add the return date, pickup time and address in the booking. Allow for the long drive, rest breaks and Cardiff Airport check-in rather than using the flight departure as the car's target arrival time." },
    ] };
  }
  return null;
}