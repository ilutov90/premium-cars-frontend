"use client";

import { useEffect, useRef } from "react";

const SETTLED_MS = 1500;
const MAX_MS = 6000;
const STOP_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Brings the results into view after a search, a sort or a page change: on a phone the filters stand above them.
 * Nothing moves when the results start in the upper half of the page (a wide screen: they are beside the filters).
 * Remount it per search (`key`) so each new search scrolls once.
 *
 * One scroll is not enough on every phone: the router's own scroll to the top of the new page and the results
 * streaming in can come after it (seen on a Samsung S23 Ultra), so the results are kept at the top until
 * the page has not moved or grown for a moment, or the visitor touches, scrolls or types.
 */
export function ScrollToResults({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    // Decided by where the results are in the page, not on the screen at this moment: right after a search the
    // page may still be scrolled as before it, and the router scrolls it to the top afterwards
    const pageTop = el.getBoundingClientRect().top + window.scrollY;
    if (pageTop <= window.innerHeight / 2) return; // a wide screen: the results are beside the filters

    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const started = performance.now();
    let changedAt = started;
    let height = document.documentElement.scrollHeight;
    let frame = 0;
    let stopped = false;
    // the site scrolls smoothly (globals.css): some Android browsers (Samsung Internet, in-app ones) cut a smooth scroll
    // short when the page changes under it, so jump while the results are held in place
    const root = document.documentElement;
    const behavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    const stop = () => {
      if (stopped) return;
      stopped = true;
      root.style.scrollBehavior = behavior;
      cancelAnimationFrame(frame);
      for (const type of STOP_EVENTS) window.removeEventListener(type, stop, true);
    };
    const align = () => {
      try {
        el.scrollIntoView({ block: "start", behavior: "instant" });
      } catch {
        // a browser that does not know "instant" (older Samsung Internet) rejects the call: scroll by hand
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - margin);
      }
    };
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      const h = document.documentElement.scrollHeight;
      if (h !== height) {
        height = h;
        changedAt = now;
      }
      const before = el.getBoundingClientRect().top;
      if (Math.abs(before - margin) > 4) {
        align(); // moved away (the router's scroll to the top, content above it): back to the results
        // at the end of a short page it cannot go further: that is not a change
        if (Math.abs(el.getBoundingClientRect().top - before) > 1) changedAt = now;
      }
      if (now - changedAt > SETTLED_MS || now - started > MAX_MS) stop();
      else frame = requestAnimationFrame(tick);
    };

    align();
    for (const type of STOP_EVENTS) window.addEventListener(type, stop, { capture: true, passive: true });
    frame = requestAnimationFrame(tick);
    return stop;
  }, [active]);

  return <div ref={ref} aria-hidden className="scroll-mt-24" />;
}
