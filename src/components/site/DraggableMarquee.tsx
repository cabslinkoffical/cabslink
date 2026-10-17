import { useEffect, useRef, type ReactNode } from "react";

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
  return <div ref={ref} role="region" aria-label={label} className={`draggable-marquee ${className}`}>{children}</div>;
}