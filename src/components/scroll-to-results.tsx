"use client";

import { useEffect, useRef } from "react";

/**
 * Brings the results into view after a search, a sort or a page change: on a phone the filters stand above them.
 * Nothing moves when the results already start in the upper half of the screen (a wide screen: they are beside the
 * filters). Remount it per search (`key`) so each new search scrolls once.
 */
export function ScrollToResults({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight / 2) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [active]);

  return <div ref={ref} aria-hidden className="scroll-mt-24" />;
}
