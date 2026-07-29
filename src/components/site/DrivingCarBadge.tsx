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
          viewBox="0 0 64 30"
          className="h-8 w-[68px] shrink-0 overflow-visible text-[var(--gold)]"
          role="img"
          aria-hidden="true"
        >
          {/* car body — solid sedan silhouette */}
          <path
            d="M2.5 22c-.8 0-1.4-.7-1.3-1.5l.5-3.6c.2-1.5 1.3-2.7 2.8-3.1l7.6-2 6.3-4.5C19.7 6.4 21.3 6 22.9 6h13.4c2.2 0 4.3.9 5.8 2.5l4.4 4.7 9.1 1.9c2.2.5 3.8 2.3 4 4.5l.1 1.2c.1.7-.5 1.2-1.2 1.2H2.5z"
            fill="currentColor"
          />
          {/* windows */}
          <path d="M22.6 8.7h-.2c-.9 0-1.8.3-2.5.8l-4.9 3.5h7.6V8.7z" fill="#0a1224" opacity="0.85" />
          <path d="M25.4 8.7h10.4c1.3 0 2.5.5 3.4 1.4l2.8 2.9H25.4V8.7z" fill="#0a1224" opacity="0.85" />
          {/* wheel arch cutouts */}
          <circle cx="17" cy="22" r="6.4" fill="#0a1224" />
          <circle cx="47" cy="22" r="6.4" fill="#0a1224" />
          {/* wheels — spinning */}
          <g className="car-wheel" style={{ transformOrigin: "17px 22px" }}>
            <circle cx="17" cy="22" r="5.4" fill="currentColor" />
            <circle cx="17" cy="22" r="2.4" fill="#0a1224" />
            <path d="M17 16.6v10.8M11.6 22h10.8M13.2 18.2l7.6 7.6M20.8 18.2l-7.6 7.6" stroke="#0a1224" strokeWidth="0.9" />
          </g>
          <g className="car-wheel" style={{ transformOrigin: "47px 22px" }}>
            <circle cx="47" cy="22" r="5.4" fill="currentColor" />
            <circle cx="47" cy="22" r="2.4" fill="#0a1224" />
            <path d="M47 16.6v10.8M41.6 22h10.8M43.2 18.2l7.6 7.6M50.8 18.2l-7.6 7.6" stroke="#0a1224" strokeWidth="0.9" />
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
