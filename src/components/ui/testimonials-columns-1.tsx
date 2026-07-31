"use client";

import React from "react";
import { motion } from "motion/react";
import { Star } from "lucide-react";

export type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration ?? 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {[...new Array(2).fill(0)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div
                key={`${index}-${i}`}
                className="p-8 rounded-3xl border border-[var(--navy)]/10 bg-card shadow-raised max-w-xs w-full"
              >
                <div className="flex items-center gap-1 text-[var(--gold-ink)]">
                  {[...Array(5)].map((_, s) => (
                    <Star key={s} className="size-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--navy)]/75">{text}</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[var(--navy)]/10">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    loading="lazy"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <div className="font-semibold tracking-tight leading-5 text-[var(--navy)] text-sm">
                      {name}
                    </div>
                    <div className="leading-5 text-[11px] text-[var(--navy)]/55 tracking-tight">
                      {role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};
