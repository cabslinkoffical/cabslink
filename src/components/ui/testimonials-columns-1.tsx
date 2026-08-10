"use client";

/**
 * Vertically scrolling testimonial column (marquee).
 *
 * Presentation only — it renders whatever items it is given and never invents
 * copy. `image` is optional: when a review source has no avatar (Trustpilot
 * does not expose one), the column falls back to an initial monogram instead of
 * a stock photo of someone who is not the reviewer.
 */
import React from "react";
import { motion } from "motion/react";

export type TestimonialColumnItem = {
  /** Verbatim excerpt, or any short text node. */
  text: React.ReactNode;
  /** Reviewer name exactly as the source shows it. */
  name: string;
  /** Secondary line, e.g. "Trustpilot · March 2026". */
  role: string;
  /** Optional avatar URL. Omit to render a monogram. */
  image?: string;
  /** Optional link to the source of the review. */
  href?: string;
  /** Optional node rendered above the text, e.g. a star row. */
  meta?: React.ReactNode;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialColumnItem[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map((item, i) => {
                const body = (
                  <>
                    {item.meta ? <div className="mb-4">{item.meta}</div> : null}
                    <div className="text-sm leading-relaxed text-[var(--navy)]/75">{item.text}</div>
                    <div className="mt-5 flex items-center gap-3">
                      {item.image ? (
                        <img
                          width={40}
                          height={40}
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--navy)] font-display text-sm font-bold text-[var(--gold)]"
                        >
                          {item.name.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="flex flex-col">
                        <div className="font-medium leading-5 tracking-tight text-[var(--navy)]">
                          {item.name}
                        </div>
                        <div className="text-xs leading-5 tracking-tight text-[var(--navy)]/55">
                          {item.role}
                        </div>
                      </div>
                    </div>
                  </>
                );

                const cardClass =
                  "block w-full max-w-xs rounded-3xl border border-[var(--navy)]/10 bg-white p-8 shadow-[0_8px_24px_rgba(14,24,44,0.06)] transition-colors hover:border-[var(--gold)]";

                return item.href ? (
                  <a
                    key={i}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={cardClass}
                  >
                    {body}
                  </a>
                ) : (
                  <div className={cardClass} key={i}>
                    {body}
                  </div>
                );
              })}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

export default TestimonialsColumn;
