import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Feature {
  step: string;
  title?: string;
  content: string;
  image: string;
}

export interface FeatureStepsProps {
  features: Feature[];
  className?: string;
  title?: string;
  autoPlayInterval?: number;
  imageHeight?: string;
}

export function FeatureSteps({
  features,
  className,
  title = "How to get Started",
  autoPlayInterval = 3000,
  imageHeight = "h-[400px]",
}: FeatureStepsProps) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 100 / (autoPlayInterval / 100);
        if (next >= 100) {
          setCurrentFeature((idx) => (idx + 1) % features.length);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPaused, autoPlayInterval, features.length]);

  const handleSelect = (index: number) => {
    setCurrentFeature(index);
    setProgress(0);
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--navy)]/10 bg-white p-6 shadow-[var(--shadow-elegant)] md:p-10",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Left column: title + steps */}
        <div className="flex flex-col">
          <h2 className="font-display text-2xl font-semibold text-[var(--navy)] md:text-3xl">
            {title}
          </h2>

          <div className="mt-8 space-y-4">
            {features.map((feature, index) => {
              const isActive = index === currentFeature;
              const isCompleted = index < currentFeature;

              return (
                <button
                  key={`${feature.step}-${index}`}
                  type="button"
                  onClick={() => handleSelect(index)}
                  className={cn(
                    "group relative w-full rounded-2xl border p-4 text-left transition-all duration-300 md:p-5",
                    isActive
                      ? "border-[var(--gold)] bg-[var(--gold)]/5 shadow-[var(--shadow-raised)]"
                      : "border-[var(--navy)]/10 bg-white hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/[0.02]"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors",
                        isActive || isCompleted
                          ? "bg-[var(--gold)] text-[var(--navy)]"
                          : "bg-[var(--navy)]/5 text-[var(--navy)]/60"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="size-4" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "font-display font-semibold transition-colors",
                          isActive ? "text-[var(--navy)]" : "text-[var(--navy)]/80"
                        )}
                      >
                        {feature.title || feature.step}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--navy)]/60">
                        {feature.content}
                      </p>
                    </div>
                  </div>

                  {/* Active progress bar */}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-[var(--gold)]"
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.1, ease: "linear" }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: image */}
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl bg-[var(--navy)]/5",
            imageHeight
          )}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentFeature}
              src={features[currentFeature].image}
              alt={features[currentFeature].title || features[currentFeature].step}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 size-full object-cover"
            />
          </AnimatePresence>

          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--navy)]/20 via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
