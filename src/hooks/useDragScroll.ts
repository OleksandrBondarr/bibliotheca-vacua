import { useCallback, useEffect, useRef } from "react";

const DRAG_THRESHOLD = 6;

/**
 * Grab-and-drag horizontal scrolling for a shelf, mouse only.
 * Touch keeps native swipe; wheel and trackpad keep native scrolling.
 * A drag longer than 6px is not allowed to become a spine click or hover.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({
    down: false,
    dragging: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastAt: 0,
    velocity: 0,
    frame: 0,
  });

  const stopInertia = useCallback(() => {
    if (state.current.frame) cancelAnimationFrame(state.current.frame);
    state.current.frame = 0;
  }, []);

  const endDrag = useCallback(() => {
    const el = ref.current;
    const s = state.current;
    if (!el || !s.down) return;
    s.down = false;
    el.style.cursor = "";
    el.style.removeProperty("user-select");

    if (!s.dragging) return;

    // Glide on after release, then let clicks through again.
    let v = s.velocity;
    const step = () => {
      v *= 0.94;
      if (Math.abs(v) < 0.05 || !ref.current) {
        el.classList.remove("shelf-dragging");
        s.dragging = false;
        s.frame = 0;
        return;
      }
      el.scrollLeft -= v * 16;
      s.frame = requestAnimationFrame(step);
    };
    s.frame = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;

    el.style.cursor = "grab";

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      stopInertia();
      el.classList.remove("shelf-dragging");
      const s = state.current;
      s.down = true;
      s.dragging = false;
      s.startX = e.clientX;
      s.lastX = e.clientX;
      s.lastAt = performance.now();
      s.velocity = 0;
      s.startScroll = el.scrollLeft;
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = state.current;
      if (!s.down) return;
      const dx = e.clientX - s.startX;
      if (!s.dragging && Math.abs(dx) > DRAG_THRESHOLD) {
        s.dragging = true;
        el.classList.add("shelf-dragging");
        el.style.cursor = "grabbing";
        el.style.setProperty("user-select", "none");
      }
      if (!s.dragging) return;
      e.preventDefault();
      el.scrollLeft = s.startScroll - dx;
      const now = performance.now();
      const dt = now - s.lastAt;
      if (dt > 0) s.velocity = (e.clientX - s.lastX) / dt;
      s.lastX = e.clientX;
      s.lastAt = now;
    };

    const onClickCapture = (e: MouseEvent) => {
      if (state.current.dragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onDragStart = (e: Event) => {
      if (state.current.down) e.preventDefault();
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", onDragStart);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", onDragStart);
      stopInertia();
    };
  }, [endDrag, stopInertia]);

  return ref;
}
