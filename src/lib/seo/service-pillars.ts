import type { PillarContent } from "@/components/site/ServicePillarPage";
import { DEFAULT_COVERAGE } from "@/components/site/ServicePillarPage";
import airportImg from "@/assets/services/airport.jpg.asset.json";
import corporateImg from "@/assets/services/corporate.jpg.asset.json";
import eventsImg from "@/assets/services/events.jpg.asset.json";
import stationImg from "@/assets/services/station.jpg.asset.json";
import toursImg from "@/assets/services/tours.jpg.asset.json";
import vipImg from "@/assets/services/vip.jpg.asset.json";

const commonIncluded = [
  "Fixed price confirmed before you travel",
  "Flight, train and ferry tracking where relevant",
  "Free waiting time and no surge pricing",
  "Fully licensed drivers and insured vehicles",
  "24/7 UK-based booking support",
  "Card, invoice or account payment",
];

export const SERVICE_PILLARS: Record<string, PillarContent> = {
  "private-hire": {
    id: "private-hire",
    eyebrow: "Private hire",
    h1: "Licensed private hire across Scotland and the UK.",
    subtitle:
      "Pre-booked, point-to-point travel in a licensed private hire car with a professional driver — no meters, no hailing, no surprises.",
    breadcrumbLabel: "Private Hire",
    metaTitle: "Private Hire Scotland — Licensed Pre-Booked Cars | Cabslink",
    metaDescription:
      "Pre-booked licensed private hire across Scotland and the UK. Fixed prices, professional drivers and 24/7 booking for any journey, airport or not.",
    image: stationImg.url,
    imageAlt: "Licensed private hire car waiting at a Scottish city kerbside",
    intro: {
      title: "Pre-booked travel, priced before you get in",
      body: "Private hire is the licensed alternative to hailing a taxi: every journey is arranged in advance, matched to a vehicle class and quoted as a fixed fare. Ideal for appointments, nights out, intercity runs and anything where arriving on time matters.",
    },
    features: [
      { icon: "wallet", title: "Fixed fares", desc: "Your price is agreed at booking and does not change in traffic." },
      { icon: "shield", title: "Licensed and insured", desc: "Every driver is licensed for private hire and every vehicle inspected." },
      { icon: "clock", title: "Booked in advance", desc: "Reserve minutes or months ahead, including recurring journeys." },
      { icon: "pin", title: "Door to door", desc: "Collected from your address and dropped at the exact entrance you need." },
    ],
    steps: [
      { title: "Enter your journey", desc: "Give us the pickup, destination, date and passenger count." },
      { title: "Choose a vehicle class", desc: "Saloon, estate, MPV or minibus — priced instantly." },
      { title: "Confirm and pay", desc: "Card or account. You get an emailed confirmation immediately." },
      { title: "Travel", desc: "Your driver arrives early and tracks any delay on your side." },
    ],
    included: commonIncluded,
    coverage: DEFAULT_COVERAGE,
    related: ["airport-transfers", "executive-transfers", "long-distance-transfers"],
    faqs: [
      { q: "What is the difference between private hire and a taxi?", a: "A taxi can be hailed on the street or picked up at a rank. Private hire must be booked in advance through an operator, which is why we can confirm a fixed price and allocate the right vehicle for your group." },
      { q: "Can I book a private hire car for a return journey?", a: "Yes. Add a return leg during booking and we hold the same vehicle class for both directions." },
      { q: "How far in advance should I book?", a: "Same-day bookings are usually fine, but for early-morning airport runs and large vehicles we recommend at least 24 hours." },
    ],
  },

  "executive-transfers": {
    id: "executive-transfers",
    eyebrow: "Executive travel",
    h1: "Executive transfers with a professional driver.",
    subtitle:
      "Premium saloons and MPVs for business travel, client collections and any journey where comfort, quiet and punctuality are non-negotiable.",
    breadcrumbLabel: "Executive Transfers",
    metaTitle: "Executive Transfers Scotland — Business Travel | Cabslink",
    metaDescription:
      "Executive car transfers across Scotland and the UK. Mercedes E-Class and V-Class vehicles, professional drivers, flight tracking and account billing.",
    image: corporateImg.url,
    imageAlt: "Executive saloon with driver waiting outside a modern office building",
    intro: {
      title: "A quiet office on wheels",
      body: "Executive travel is our premium tier: newer vehicles, drivers briefed on your schedule, and space to work or rest between meetings. Popular for client collections, board visits, roadshows and airport runs where first impressions count.",
    },
    features: [
      { icon: "briefcase", title: "Business-ready cars", desc: "Mercedes-Benz E-Class, S-Class and V-Class with room to work." },
      { icon: "badge", title: "Vetted drivers", desc: "Experienced, suited drivers who handle luggage and doors as standard." },
      { icon: "plane", title: "Flight tracking", desc: "Arrival times adjust automatically if your flight moves." },
      { icon: "card", title: "Account billing", desc: "Monthly invoicing with cost centres for corporate clients." },
    ],
    steps: [
      { title: "Tell us the schedule", desc: "One journey or a full day of movements between meetings." },
      { title: "We allocate the class", desc: "Executive saloon or people carrier based on passengers and bags." },
      { title: "Driver briefed", desc: "Contact details shared ahead of pickup, with meet and greet if requested." },
      { title: "Travel and settle", desc: "Pay per journey or on your corporate account." },
    ],
    included: [
      "Executive-class vehicle, three years old or newer",
      "Suited, experienced professional driver",
      "Complimentary bottled water and phone charging",
      "Flight and train tracking with free waiting",
      "Meet and greet available on request",
      "Corporate account invoicing",
    ],
    coverage: DEFAULT_COVERAGE,
    related: ["corporate-travel", "airport-transfers", "vip-transfers"],
    faqs: [
      { q: "Which vehicles are used for executive transfers?", a: "Typically a Mercedes-Benz E-Class for one to three passengers, or a V-Class people carrier for up to seven with luggage. You can see every option on our fleet page." },
      { q: "Can I book a driver for a full day of meetings?", a: "Yes — hourly hire keeps the same car and driver with you as directed, which works better than separate bookings when your schedule may move." },
      { q: "Do you offer corporate accounts?", a: "We do. Accounts include monthly invoicing, booking references, cost-centre tagging and priority allocation." },
    ],
  },

  "long-distance-transfers": {
    id: "long-distance-transfers",
    eyebrow: "Long distance",
    h1: "Long-distance transfers, priced door to door.",
    subtitle:
      "One vehicle, one driver, one fixed price — Edinburgh to London, Glasgow to Manchester, the Highlands and everywhere between.",
    breadcrumbLabel: "Long-Distance Transfers",
    metaTitle: "Long Distance Taxi & Transfers UK — Fixed Price | Cabslink",
    metaDescription:
      "Long-distance transfers across the UK with a fixed door-to-door price. Comfortable vehicles, comfort stops, luggage space and no per-mile surprises.",
    image: toursImg.url,
    imageAlt: "Vehicle travelling a long-distance route through the Scottish countryside",
    intro: {
      title: "Better than changing trains three times",
      body: "For journeys over 50 miles, a single private vehicle is often faster, calmer and — for two or more people — comparable in cost to rail. We quote the whole trip up front, including tolls, and plan comfort stops on the way.",
    },
    features: [
      { icon: "route", title: "One fixed quote", desc: "Distance, tolls and driver hours included, agreed before you book." },
      { icon: "luggage", title: "Real luggage space", desc: "Estates and MPVs so cases, prams and kit all travel with you." },
      { icon: "clock", title: "Comfort stops", desc: "Planned breaks on longer routes at your driver's suggestion." },
      { icon: "users", title: "Cheaper shared", desc: "The price is per vehicle, not per person." },
    ],
    steps: [
      { title: "Enter both ends", desc: "Any UK address, airport, port or postcode." },
      { title: "See the mileage price", desc: "Our engine prices the real driving route, not a straight line." },
      { title: "Pick your class", desc: "Larger classes for groups or heavy luggage." },
      { title: "Relax", desc: "Door-to-door with a single driver for the whole journey." },
    ],
    included: commonIncluded,
    coverage: DEFAULT_COVERAGE,
    related: ["private-hire", "executive-transfers", "group-transfers"],
    faqs: [
      { q: "Is a long-distance transfer cheaper than the train?", a: "For a single traveller usually not, but for two or more passengers with luggage it is frequently comparable — and it is door to door with no changes." },
      { q: "Do you charge for the driver's return journey?", a: "Our long-distance quotes already account for it. The price you see is the price you pay." },
      { q: "Are there breaks on long trips?", a: "Yes. Drivers take legally required rest breaks and will stop for refreshments on request." },
    ],
  },

  "group-transfers": {
    id: "group-transfers",
    eyebrow: "Group travel",
    h1: "Group transfers for parties too big for one car.",
    subtitle:
      "From eight friends to a two-hundred-strong conference — we plan the vehicle mix, the timings and the pickup points.",
    breadcrumbLabel: "Group Transfers",
    metaTitle: "Group Transfers Scotland — Multi-Vehicle Travel | Cabslink",
    metaDescription:
      "Group transfers across Scotland and the UK. Minibuses, coaches and multi-car convoys with one coordinator, one quote and one arrival time.",
    image: eventsImg.url,
    imageAlt: "Group of travellers boarding a minibus for a private transfer",
    intro: {
      title: "One coordinator, one arrival time",
      body: "Moving a group is a logistics problem, not just a booking. We work out whether you need one minibus, three MPVs or a coach, stagger pickups so everyone arrives together, and give you a single point of contact on the day.",
    },
    features: [
      { icon: "users", title: "Any group size", desc: "8 to 200+ passengers across minibuses, coaches and car convoys." },
      { icon: "calendar", title: "Staggered timings", desc: "Multiple pickups planned to converge on one arrival slot." },
      { icon: "phone", title: "Day-of contact", desc: "A named coordinator reachable throughout the movement." },
      { icon: "wallet", title: "Single invoice", desc: "One quote and one payment for the whole group." },
    ],
    steps: [
      { title: "Share the numbers", desc: "Passengers, luggage, pickup points and the time you must arrive." },
      { title: "We plan the mix", desc: "The cheapest safe combination of vehicle classes for your group." },
      { title: "Approve the plan", desc: "You get a written schedule with each vehicle and its pickups." },
      { title: "We run the day", desc: "Drivers coordinated by one person so nothing drifts." },
    ],
    included: [
      "Written vehicle and timing plan before the day",
      "Named coordinator during the movement",
      "Single consolidated invoice",
      "Luggage capacity checked against your group",
      "Accessible vehicle options on request",
      "24/7 UK support line",
    ],
    coverage: DEFAULT_COVERAGE,
    related: ["minibus-hire", "coach-hire", "event-transport"],
    faqs: [
      { q: "How many people fit in one vehicle?", a: "Eight in a large MPV, 16 in a standard minibus, 24 in a coaster and up to 55 in a full coach. Luggage reduces those figures, so we always check bags too." },
      { q: "Can the group split across several pickups?", a: "Yes. We commonly collect from several hotels or addresses and time each so everyone arrives together." },
      { q: "Do you handle airport groups?", a: "Regularly — including flight tracking on arrivals and staged departures for outbound groups." },
    ],
  },

  "minibus-hire": {
    id: "minibus-hire",
    eyebrow: "Minibus hire",
    h1: "Minibus hire with a driver, 8 to 24 seats.",
    subtitle:
      "Airport runs, wedding shuttles, golf trips and day tours in a modern minibus with a professional driver and proper luggage space.",
    breadcrumbLabel: "Minibus Hire",
    metaTitle: "Minibus Hire With Driver Scotland — 8 to 24 Seats | Cabslink",
    metaDescription:
      "Minibus hire with a driver across Scotland. 8, 16 and 24-seat vehicles for airports, weddings, golf and tours with fixed prices and luggage space.",
    image: eventsImg.url,
    imageAlt: "Modern 16-seat minibus ready for a private group transfer",
    intro: {
      title: "The right size between a car and a coach",
      body: "A minibus keeps a group of 8 to 24 together in one vehicle at one price. Ours come with a driver as standard — no licence categories to worry about, no parking to arrange and no one nominated as designated driver.",
    },
    features: [
      { icon: "bus", title: "8, 16 and 24 seats", desc: "Matched to headcount so you never pay for empty seats." },
      { icon: "luggage", title: "Luggage and kit", desc: "Trailer or rear-hold options for cases, clubs and instruments." },
      { icon: "badge", title: "Driver included", desc: "PSV-licensed drivers, so nobody in your group has to drive." },
      { icon: "clock", title: "Hourly or point to point", desc: "Book a single transfer or keep the minibus for the day." },
    ],
    steps: [
      { title: "Tell us headcount and bags", desc: "That decides between an 8, 16 or 24-seater." },
      { title: "Choose transfer or day hire", desc: "One-way, return, or as-directed by the hour." },
      { title: "Confirm the itinerary", desc: "We agree pickup points and any waiting time." },
      { title: "Travel together", desc: "One vehicle, one driver, one price." },
    ],
    included: commonIncluded,
    coverage: DEFAULT_COVERAGE,
    related: ["group-transfers", "coach-hire", "tours"],
    faqs: [
      { q: "Does minibus hire include a driver?", a: "Yes — every minibus we supply comes with a professional licensed driver. We do not offer self-drive." },
      { q: "How much luggage fits in a 16-seater?", a: "Roughly one medium case per passenger in a rear-hold minibus. For full luggage plus 16 people we usually recommend a trailer or a 24-seat coaster." },
      { q: "Can we stop on the way?", a: "Yes. Add stops during booking or agree them with your driver; extended waiting is charged by the hour." },
    ],
  },

  "coach-hire": {
    id: "coach-hire",
    eyebrow: "Coach hire",
    h1: "Coach hire with a driver for 25 to 55 passengers.",
    subtitle:
      "Conferences, weddings, sports clubs and school groups moved in one comfortable coach with luggage holds and a professional driver.",
    breadcrumbLabel: "Coach Hire",
    metaTitle: "Coach Hire Scotland — 25 to 55 Seats With Driver | Cabslink",
    metaDescription:
      "Coach hire with driver across Scotland and the UK. 25, 35 and 55-seat coaches for conferences, weddings, sports and school groups. Fixed quotes.",
    image: eventsImg.url,
    imageAlt: "Full-size touring coach parked ready to board a large group",
    intro: {
      title: "One vehicle for the whole party",
      body: "When your group passes 25 people, a coach is almost always cheaper and simpler than multiple minibuses. Ours have underfloor luggage holds, air conditioning, reclining seats and drivers who know the access routes to Scotland's venues.",
    },
    features: [
      { icon: "bus", title: "25 to 55 seats", desc: "Midi-coaches and full-size touring coaches." },
      { icon: "luggage", title: "Underfloor holds", desc: "Real luggage capacity for airport and multi-day trips." },
      { icon: "pin", title: "Venue access knowledge", desc: "Drivers who know coach bays, drop-offs and restricted streets." },
      { icon: "shield", title: "PSV compliant", desc: "Operator-licensed vehicles with tachograph-compliant driver hours." },
    ],
    steps: [
      { title: "Give us the brief", desc: "Passenger numbers, route, timings and any multi-day requirement." },
      { title: "We quote the coach", desc: "Including driver hours, parking and any overnight costs." },
      { title: "Plan the pickups", desc: "Coach-accessible points confirmed in writing." },
      { title: "Travel", desc: "One coach, one driver, everyone together." },
    ],
    included: [
      "Coach-accessible pickup points confirmed in advance",
      "Underfloor luggage stowage",
      "Air conditioning and reclining seats",
      "PSV-licensed driver with compliant hours",
      "Driver parking and tolls in the quote",
      "Multi-day and overnight options",
    ],
    coverage: DEFAULT_COVERAGE,
    related: ["group-transfers", "minibus-hire", "event-transport"],
    faqs: [
      { q: "How many passengers fit on a coach?", a: "Our midi-coaches seat 25 to 35 and full-size touring coaches seat up to 55, with underfloor luggage on both." },
      { q: "Can a coach reach my venue?", a: "Most can, but historic centres and some hotels have no coach bay. Tell us the venue and we will confirm the nearest legal drop-off before you book." },
      { q: "Are multi-day coach hires possible?", a: "Yes — including driver accommodation and rest periods, which we include in the quote." },
    ],
  },

  "cruise-transfers": {
    id: "cruise-transfers",
    eyebrow: "Cruise transfers",
    h1: "Cruise port transfers with room for every case.",
    subtitle:
      "Door-to-ship travel to Greenock, Rosyth, Leith, Invergordon and Southampton, timed around your boarding window.",
    breadcrumbLabel: "Cruise Transfers",
    metaTitle: "Cruise Port Transfers Scotland — Greenock & Rosyth | Cabslink",
    metaDescription:
      "Private cruise transfers to Scottish and UK ports. Greenock, Rosyth, Leith, Invergordon and Southampton with cruise-luggage space and boarding-time planning.",
    image: airportImg.url,
    imageAlt: "Private transfer vehicle at a cruise terminal with luggage being loaded",
    intro: {
      title: "Cruise luggage needs a bigger boot",
      body: "Cruise passengers travel with more bags than almost anyone else. We size the vehicle around your cases rather than your headcount, and plan the pickup around your boarding window so you are never the last name called.",
    },
    features: [
      { icon: "ship", title: "Terminal knowledge", desc: "We know the drop-off points at every major UK cruise terminal." },
      { icon: "luggage", title: "Sized for cases", desc: "Vehicle class chosen from your bag count, not just passengers." },
      { icon: "clock", title: "Boarding-window timing", desc: "Arrival planned against your embarkation slot." },
      { icon: "plane", title: "Fly-cruise friendly", desc: "Airport-to-port legs with flight tracking on the inbound." },
    ],
    steps: [
      { title: "Give us the ship and port", desc: "Plus your boarding window or disembarkation time." },
      { title: "Count the bags", desc: "We size the vehicle to the luggage as well as the party." },
      { title: "Confirm the pickup", desc: "Timed to reach the terminal comfortably inside your slot." },
      { title: "Ship to door on return", desc: "Return legs meet you at the terminal exit." },
    ],
    included: commonIncluded,
    coverage: [
      { label: "Greenock (Ocean Terminal)", to: "/cruise-ports" },
      { label: "Rosyth", to: "/cruise-ports" },
      { label: "Leith (Edinburgh)", to: "/cruise-ports" },
      { label: "Invergordon", to: "/cruise-ports" },
      { label: "South Queensferry", to: "/cruise-ports" },
      { label: "All cruise ports", to: "/cruise-ports" },
    ],
    related: ["airport-transfers", "long-distance-transfers", "group-transfers"],
    faqs: [
      { q: "Which cruise ports do you serve?", a: "All Scottish ports including Greenock, Rosyth, Leith, South Queensferry and Invergordon, plus long-distance runs to Southampton, Liverpool and Newcastle." },
      { q: "How early should we arrive at the terminal?", a: "Cruise lines usually issue a boarding window. We aim to have you at the terminal at the start of yours, allowing for traffic on the day." },
      { q: "Can you collect us from the airport before a cruise?", a: "Yes. Fly-cruise transfers are one of our most common bookings, with flight tracking included." },
    ],
  },

  "university-transfers": {
    id: "university-transfers",
    eyebrow: "Student travel",
    h1: "University transfers for arrivals, term starts and campus runs.",
    subtitle:
      "Airport-to-halls travel for new students, parents' move-in trips and end-of-term journeys home — with space for everything you packed.",
    breadcrumbLabel: "University Transfers",
    metaTitle: "University Transfers Scotland — Airport to Campus | Cabslink",
    metaDescription:
      "University transfers across Scotland. Airport-to-halls travel for Edinburgh, Glasgow, St Andrews, Dundee and Aberdeen students with luggage space.",
    image: stationImg.url,
    imageAlt: "Student arriving at university halls with luggage from a private transfer",
    intro: {
      title: "First arrival, last departure, and everything between",
      body: "Term start is the busiest travel week of the student year. We pre-book arrivals against flight numbers, take you straight to the right halls entrance, and give parents a booking reference they can track from home.",
    },
    features: [
      { icon: "plane", title: "Flight-tracked arrivals", desc: "Delayed or early, your driver adjusts and waits free." },
      { icon: "luggage", title: "Room for a term's kit", desc: "Estates and MPVs for suitcases, bedding and boxes." },
      { icon: "pin", title: "Halls-level accuracy", desc: "Dropped at the correct residence entrance, not the campus gate." },
      { icon: "card", title: "Paid by a parent", desc: "Book and pay remotely for a student travelling alone." },
    ],
    steps: [
      { title: "Book with the flight number", desc: "Or the train arrival for domestic students." },
      { title: "Name the residence", desc: "We map the exact halls entrance in advance." },
      { title: "Meet and greet on arrival", desc: "Driver waiting in arrivals with a name board." },
      { title: "Straight to halls", desc: "One journey, no changes, luggage handled." },
    ],
    included: commonIncluded,
    coverage: [
      { label: "University of Edinburgh", to: "/universities" },
      { label: "University of Glasgow", to: "/universities" },
      { label: "University of St Andrews", to: "/universities" },
      { label: "University of Dundee", to: "/universities" },
      { label: "University of Aberdeen", to: "/universities" },
      { label: "All universities", to: "/universities" },
    ],
    related: ["airport-transfers", "long-distance-transfers", "private-hire"],
    faqs: [
      { q: "Can a parent book for a student travelling alone?", a: "Yes. Book and pay remotely, add the student's mobile number, and we share the driver's details with both of you." },
      { q: "Will you take us to a specific hall of residence?", a: "Yes — give us the residence name at booking and the driver will use the correct entrance rather than a general campus address." },
      { q: "Do you cover end-of-term departures?", a: "We do, and we recommend booking early: the last week of term is as busy as freshers' week." },
    ],
  },

  "hospital-transfers": {
    id: "hospital-transfers",
    eyebrow: "Medical travel",
    h1: "Hospital transfers for appointments and discharge.",
    subtitle:
      "Non-emergency, pre-booked travel to clinics and hospitals across Scotland, with patient drivers and door-to-door assistance.",
    breadcrumbLabel: "Hospital Transfers",
    metaTitle: "Hospital Transfers Scotland — Appointment Travel | Cabslink",
    metaDescription:
      "Non-emergency hospital transfers across Scotland. Pre-booked appointment and discharge travel with patient drivers, door assistance and fixed prices.",
    image: stationImg.url,
    imageAlt: "Private car waiting at a hospital main entrance for a patient transfer",
    intro: {
      title: "Calm, unhurried travel on a difficult day",
      body: "Appointments run late and discharges rarely happen on schedule. Our hospital transfers allow for that: we hold the booking, wait where waiting is allowed, and stay in touch with whoever is coordinating the collection.",
    },
    features: [
      { icon: "heart", title: "Patient-first drivers", desc: "Unhurried, helpful and used to assisting to the door." },
      { icon: "clock", title: "Flexible discharge timing", desc: "We re-time collections when the ward runs late." },
      { icon: "users", title: "Companion travels free", desc: "A relative or carer can travel with the patient." },
      { icon: "calendar", title: "Recurring appointments", desc: "Repeat bookings for treatment courses." },
    ],
    steps: [
      { title: "Book the appointment slot", desc: "Give the hospital, department and appointment time." },
      { title: "Door-to-door pickup", desc: "Collected from home, assisted to the vehicle." },
      { title: "Held return", desc: "We hold the return until the ward confirms discharge." },
      { title: "Home again", desc: "Assisted back to the door, not just the kerb." },
    ],
    included: [
      "Assistance from door to vehicle",
      "One companion or carer travels at no extra cost",
      "Flexible re-timing when appointments overrun",
      "Wheelchair-accessible vehicles on request",
      "Recurring bookings for treatment courses",
      "Fixed price with no waiting-time surprises",
    ],
    coverage: [
      { label: "Royal Infirmary of Edinburgh", to: "/hospitals" },
      { label: "Queen Elizabeth University Hospital", to: "/hospitals" },
      { label: "Ninewells Hospital, Dundee", to: "/hospitals" },
      { label: "Aberdeen Royal Infirmary", to: "/hospitals" },
      { label: "Raigmore Hospital, Inverness", to: "/hospitals" },
      { label: "All hospitals", to: "/hospitals" },
    ],
    related: ["private-hire", "executive-transfers", "long-distance-transfers"],
    faqs: [
      { q: "Is this an ambulance service?", a: "No. We provide non-emergency, pre-booked passenger travel only. For medical emergencies always call 999." },
      { q: "What if the discharge time changes?", a: "Tell us as soon as you know and we re-time the collection at no charge. We build flexibility into every hospital booking." },
      { q: "Can a wheelchair user travel?", a: "Yes — request a wheelchair-accessible vehicle when booking and we allocate one." },
    ],
  },

  "wedding-transport": {
    id: "wedding-transport",
    eyebrow: "Weddings",
    h1: "Wedding transport for the couple and every guest.",
    subtitle:
      "Bridal cars, guest shuttles and end-of-night runs, timed to a written schedule so nobody is waiting outside a church.",
    breadcrumbLabel: "Wedding Transport",
    metaTitle: "Wedding Transport Scotland — Bridal Cars | Cabslink",
    metaDescription:
      "Wedding transport across Scotland. Bridal cars, guest minibus shuttles and late-night returns on a written schedule with a dedicated coordinator.",
    image: vipImg.url,
    imageAlt: "Luxury wedding car decorated and waiting outside a Scottish venue",
    intro: {
      title: "A schedule, not a hope",
      body: "Wedding travel fails on timing, not on cars. We build a written movement plan around your ceremony time — bridal party, guests, photographs and the last shuttle home — and give you one coordinator who owns it on the day.",
    },
    features: [
      { icon: "sparkles", title: "Bridal vehicles", desc: "Premium saloons and luxury classes for the couple and party." },
      { icon: "bus", title: "Guest shuttles", desc: "Minibuses and coaches looping between hotel, venue and home." },
      { icon: "calendar", title: "Written timing plan", desc: "Every movement documented and confirmed a week ahead." },
      { icon: "phone", title: "Day-of coordinator", desc: "One number for the wedding party, not per-driver chasing." },
    ],
    steps: [
      { title: "Share the running order", desc: "Ceremony, reception, photo stops and guest hotels." },
      { title: "We build the plan", desc: "Vehicles and timings for every leg, priced as one quote." },
      { title: "Confirm a week out", desc: "Final headcounts and any last-minute changes locked in." },
      { title: "We run the day", desc: "Coordinated drivers, including late-night returns." },
    ],
    included: [
      "Written movement schedule for the whole day",
      "Dedicated coordinator on the wedding day",
      "Bridal vehicle held exclusively for your booking",
      "Guest shuttle loops between venue and hotels",
      "Late-night return runs",
      "One consolidated invoice",
    ],
    coverage: DEFAULT_COVERAGE,
    related: ["event-transport", "group-transfers", "vip-transfers"],
    faqs: [
      { q: "How far ahead should we book wedding transport?", a: "Six to nine months for summer Saturdays in Scotland; peak dates and larger guest shuttles go first." },
      { q: "Can you shuttle guests between the hotel and venue?", a: "Yes. We plan looping shuttles so guests arrive in waves and can leave when they choose." },
      { q: "Is the bridal car exclusive to us?", a: "It is. The vehicle and driver are held for your day only and do not take other bookings around it." },
    ],
  },

  "event-transport": {
    id: "event-transport",
    eyebrow: "Events",
    h1: "Event transport for conferences, concerts and festivals.",
    subtitle:
      "Multi-vehicle scheduled movement around a dated event — delegates, artists, crew and VIP guests, all landed on time.",
    breadcrumbLabel: "Event Transport",
    metaTitle: "Event Transport Scotland — Conference Travel | Cabslink",
    metaDescription:
      "Event transport across Scotland. Delegate shuttles, artist and crew runs and VIP arrivals with scheduled multi-vehicle planning and one point of contact.",
    image: eventsImg.url,
    imageAlt: "Fleet of vehicles staged outside an event venue for guest transport",
    intro: {
      title: "Event travel is a schedule problem",
      body: "Festivals, conferences and awards nights all fail in the same place: the 20 minutes when everyone leaves at once. We plan staged departures, pre-agreed pickup zones and enough vehicles in the right place — and we run it from one control point.",
    },
    features: [
      { icon: "calendar", title: "Scheduled waves", desc: "Staged arrivals and departures instead of a single crush." },
      { icon: "pin", title: "Agreed pickup zones", desc: "Cleared with venue and traffic management ahead of the day." },
      { icon: "users", title: "Delegate and crew runs", desc: "Separate flows for guests, speakers, artists and crew." },
      { icon: "phone", title: "Single control point", desc: "One coordinator directing every vehicle on the day." },
    ],
    steps: [
      { title: "Share the event brief", desc: "Dates, venues, headcount and the arrival windows." },
      { title: "We plan the waves", desc: "Vehicle mix and timings per flow, written up and priced." },
      { title: "Zones confirmed", desc: "Pickup and drop-off points agreed with the venue." },
      { title: "Run day", desc: "Coordinated dispatch with live re-timing if the schedule slips." },
    ],
    included: [
      "Written transport plan per flow and per wave",
      "Coordinator on site or on call for the event",
      "Pre-agreed pickup and drop-off zones",
      "Mixed vehicle classes from saloon to coach",
      "Live re-timing when the run sheet slips",
      "One consolidated invoice with cost centres",
    ],
    coverage: DEFAULT_COVERAGE,
    related: ["stadium-transfers", "group-transfers", "corporate-travel"],
    faqs: [
      { q: "Can you handle multi-day festivals?", a: "Yes. Multi-day events get a repeating daily plan with adjusted headcounts and a standing coordinator." },
      { q: "Do you work with venue traffic management?", a: "We do. Pickup zones are agreed with the venue in advance so drivers are not turned away from closed roads." },
      { q: "What happens if the event overruns?", a: "The coordinator re-times departures live and holds vehicles in a staging area — you are not charged surge rates for the delay." },
    ],
  },
};

export function getPillar(id: string): PillarContent | undefined {
  return SERVICE_PILLARS[id];
}
