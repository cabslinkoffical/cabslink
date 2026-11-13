import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Retains the existing CSS loop while scrubbing its position during a drag. */
export function DraggableMarquee({ children, className, label }: { children: ReactNode; className: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const track = element?.firstElementChild;
    if (!element || !(track instanceof HTMLElement)) return;
    let pointer: number | null = null;
    let start = 0;
    let previous = 0;
    let dragged = false;
    let animation: Animation | undefined;
    const resume = () => {
      if (!element.matches(":hover") && !element.contains(document.activeElement)) animation?.play();
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer = event.pointerId;
      start = previous = event.clientX;
      dragged = false;
      animation = track.getAnimations()[0];
      animation?.pause();
    };
    const move = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      if (!dragged && Math.abs(event.clientX - start) < 6) return;
      dragged = true;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "true";
      const delta = event.clientX - previous;
      previous = event.clientX;
      const duration = Number(animation?.effect?.getTiming().duration);
      if (animation && duration > 0) {
        const distance = (track.scrollWidth + parseFloat(getComputedStyle(track).columnGap || "0")) / 2;
        const next = Number(animation.currentTime ?? 0) - delta * duration / distance;
        animation.currentTime = ((next % duration) + duration) % duration;
      } else element.scrollLeft -= delta;
      event.preventDefault();
    };
    const up = () => {
      if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
      pointer = null;
      delete element.dataset.dragging;
      resume();
    };
    const click = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };
    const preventNativeDrag = (event: DragEvent) => event.preventDefault();
    const leave = () => { if (pointer === null) animation?.play(); };
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("click", click, true);
    element.addEventListener("dragstart", preventNativeDrag);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointerdown", down);
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up);
      element.removeEventListener("click", click, true);
      element.removeEventListener("dragstart", preventNativeDrag);
      element.removeEventListener("pointerleave", leave);
    };
  }, []);
  /** Moves the loop by roughly one card so the carousel has visible controls. */
  const step = (direction: 1 | -1) => {
    const element = ref.current;
    const track = element?.firstElementChild;
    if (!element || !(track instanceof HTMLElement)) return;
    const card = track.firstElementChild instanceof HTMLElement ? track.firstElementChild.offsetWidth : 300;
    const gap = parseFloat(getComputedStyle(track).columnGap || "0");
    const animation = track.getAnimations()[0];
    const duration = Number(animation?.effect?.getTiming().duration);
    if (animation && duration > 0) {
      const distance = (track.scrollWidth + gap) / 2;
      const next = Number(animation.currentTime ?? 0) + direction * (card + gap) * duration / distance;
      animation.currentTime = ((next % duration) + duration) % duration;
    } else element.scrollBy({ left: direction * (card + gap), behavior: "smooth" });
  };
  const control = "inline-flex size-11 items-center justify-center rounded-full border border-current/25 bg-background/90 text-[var(--navy)] shadow-sm transition-colors hover:bg-[var(--gold)] hover:text-[var(--gold-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--gold)]";
  return (
    <div>
      <div ref={ref} role="region" aria-label={label} className={`draggable-marquee ${className}`}>{children}</div>
      <div className="container-x mt-4 flex justify-end gap-2">
        <button type="button" className={control} aria-label={`Previous — ${label}`} onClick={() => step(-1)}><ChevronLeft className="size-5" /></button>
        <button type="button" className={control} aria-label={`Next — ${label}`} onClick={() => step(1)}><ChevronRight className="size-5" /></button>
      </div>
    </div>
  );
}