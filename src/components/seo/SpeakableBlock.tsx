import type { ReactNode } from "react";

/**
 * Wraps a summary paragraph so it can be referenced by a speakable schema
 * (voice assistants / AI overviews). Pair with speakableSchema(['.speakable']).
 */
export function SpeakableBlock({ children }: { children: ReactNode }) {
  return (
    <div className="speakable text-lg leading-relaxed text-[var(--navy)]/90">
      {children}
    </div>
  );
}
