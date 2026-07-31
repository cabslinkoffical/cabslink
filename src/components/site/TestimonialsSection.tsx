import { motion } from "motion/react";
import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns-1";

const testimonials: Testimonial[] = [
  {
    text: "Our driver was waiting at arrivals with a name board. Immaculate vehicle, calm and professional — the best airport transfer we've used in the UK.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Sarah M.",
    role: "Frequent flyer · Edinburgh",
  },
  {
    text: "We moved our entire executive travel to Cabslink. Reliable, on time and polished — and the monthly invoicing is a real relief.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "James R.",
    role: "Operations Director · Glasgow",
  },
  {
    text: "They handled five vehicles across two venues without a hitch. Pure professionalism from the first quote to the final drop-off.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Priya K.",
    role: "Wedding Planner · Stirling",
  },
  {
    text: "Flight landed two hours late and the driver was still there, tracking us the whole time. No extra charge, no fuss.",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Omar R.",
    role: "Consultant · Aberdeen",
  },
  {
    text: "Booked a full-day Highlands trip. Fixed price up front, spotless V-Class, and a driver who knew every viewpoint worth stopping at.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Zainab H.",
    role: "Private Client · Inverness",
  },
  {
    text: "Child seats ready, luggage handled, and a text before pickup. Travelling with two toddlers has never been this easy.",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Aliza K.",
    role: "Family Traveller · Dundee",
  },
  {
    text: "We use Cabslink for every client visit now. Quotes come back within minutes and the drivers represent us perfectly.",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "Farhan S.",
    role: "Marketing Director · Edinburgh",
  },
  {
    text: "Clear pricing with no hidden extras. What I saw at booking is exactly what I paid — rare in this industry.",
    image: "https://randomuser.me/api/portraits/women/8.jpg",
    name: "Sana S.",
    role: "Sales Manager · Perth",
  },
  {
    text: "Late-night pickup from Glasgow Airport, driver already parked and waiting. Smooth, quiet, and genuinely comfortable ride home.",
    image: "https://randomuser.me/api/portraits/men/9.jpg",
    name: "Hassan A.",
    role: "Business Traveller · Glasgow",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export function TestimonialsSection() {
  return (
    <section className="section-y bg-white relative">
      <div className="container-x z-10 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center"
        >
          <div className="rounded-full border border-[var(--navy)]/15 px-4 py-1.5">
            <span className="text-[11px] uppercase tracking-[0.28em] font-semibold text-[var(--gold-ink)]">
              Customer Reviews
            </span>
          </div>

          <h2 className="mt-6 font-display text-4xl md:text-5xl font-bold text-[var(--navy)] leading-[1.05]">
            What our clients <span className="text-[var(--gold-ink)]">say.</span>
          </h2>
          <p className="mt-4 text-sm md:text-base text-[var(--navy)]/60 leading-relaxed">
            Thousands of airport transfers, corporate journeys and private tours across the UK — here's
            how they went.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-14 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={16} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={20} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={18} />
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
