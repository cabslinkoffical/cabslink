/**
 * Trustpilot brand primitives.
 *
 * The green (#00B67A) and the star-in-a-square mark belong to Trustpilot and
 * are used here purely as third-party attribution, so visitors can tell at a
 * glance that the score is independent rather than a first-party Cabslink
 * rating. This is the one intentional exception to the Navy/Gold palette; do
 * not use these colours anywhere else in the site.
 */
const TRUSTPILOT_GREEN = "#00B67A";
const TRUSTPILOT_GREY = "#DCDCE6";

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#fff" aria-hidden="true">
      <path d="M12 2.6l2.62 6.37 6.88.5-5.27 4.45 1.63 6.71L12 16.98l-5.86 3.65 1.63-6.71L2.5 9.47l6.88-.5L12 2.6z" />
    </svg>
  );
}

/**
 * Trustpilot's star rating widget: a row of green tiles, where the tile for a
 * partial score is clipped to the fraction earned.
 */
export function TrustpilotStars({
  rating,
  size = "md",
  label,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  /** Accessible description; falls back to a plain "x out of 5" reading. */
  label?: string;
}) {
  const tile = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={label ?? `${rating} out of 5 stars on Trustpilot`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - (i - 1)));
        return (
          <span
            key={i}
            className={`relative inline-block overflow-hidden rounded-[2px] ${tile}`}
            style={{ backgroundColor: TRUSTPILOT_GREY }}
          >
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%`, backgroundColor: TRUSTPILOT_GREEN }}
            />
            <StarGlyph className="absolute inset-0 h-full w-full p-[2px]" />
          </span>
        );
      })}
    </div>
  );
}

/** Trustpilot wordmark with its star, for attribution lines. */
export function TrustpilotWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={TRUSTPILOT_GREEN} aria-hidden="true">
        <path d="M12 2.6l2.62 6.37 6.88.5-5.27 4.45 1.63 6.71L12 16.98l-5.86 3.65 1.63-6.71L2.5 9.47l6.88-.5L12 2.6z" />
      </svg>
      <span className="font-semibold tracking-tight">Trustpilot</span>
    </span>
  );
}
