type DrivingCarBadgeProps = {
  label: string;
  className?: string;
};

/**
 * Eyebrow badge: a small car whose wheels spin, sitting on a moving road line.
 * No pill / oval container — just the car, the text, and the road beneath.
 */
export function DrivingCarBadge({ label, className }: DrivingCarBadgeProps) {
  return (
    <div className={`inline-flex w-fit max-w-full flex-col items-start gap-1.5 ${className ?? ""}`}>
      <div className="flex items-center gap-2.5 whitespace-nowrap">
        <svg
          viewBox="0 0 40 22"
          className="h-5 w-9 shrink-0 overflow-visible text-[var(--gold)]"
          role="img"
          aria-hidden="true"
        >
          {/* body */}
          <path
            d="M3 15c0-2 1-3.4 3-3.8l4.2-.8 4.4-4.1c.9-.8 2-1.3 3.2-1.3h7.4c1.6 0 3 .8 3.9 2.1l2.3 3.4 3.4 1c1.3.4 2.2 1.6 2.2 3V15"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M3 15h34" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          {/* windows */}
          <path
            d="M16.4 6.6v4.1h7.9l-2.6-4.1z"
            fill="currentColor"
            opacity="0.35"
          />
          {/* wheels — spinning */}
          <g className="car-wheel" style={{ transformOrigin: "12px 15px" }}>
            <circle cx="12" cy="15" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 11.8v6.4M8.8 15h6.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          </g>
          <g className="car-wheel" style={{ transformOrigin: "29px 15px" }}>
            <circle cx="29" cy="15" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M29 11.8v6.4M25.8 15h6.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity="0.8" />
          </g>
        </svg>

        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.32em] text-white">
          {label}
        </span>
      </div>

      {/* road line with moving dashes */}
      <svg
        viewBox="0 0 240 2"
        preserveAspectRatio="none"
        className="h-[2px] w-full text-[var(--gold)]"
        aria-hidden="true"
      >
        <line x1="0" y1="1" x2="240" y2="1" stroke="currentColor" strokeWidth="2" opacity="0.28" />
        <line
          x1="0"
          y1="1"
          x2="240"
          y2="1"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="10 12"
          className="road-dash"
        />
      </svg>
    </div>
  );
}

export default DrivingCarBadge;
