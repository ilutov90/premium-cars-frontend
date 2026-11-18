"use client";

import { useEffect } from "react";

const WAIT_MS = 5000;
const SETTLED_MS = 2000;
const MAX_MS = 15000;
const STOP_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Keeps the section a link's "#hash" points at in view while the page above it is still streaming in
 * (e.g. the home page's delivered cars push "#contact" down after the browser scrolled to it).
 * Works for a page opened with a hash and for in-site links; follows while the page grows (until it has not changed for
 * 2 s) and stops at the visitor's first scroll, touch or key.
 */
export function HashAnchor() {
  useEffect(() => {
    let stop: (() => void) | null = null;

    const hold = (id: string, path: string, samePage: boolean) => {
      stop?.();
      let cancelled = false;
      let frame = 0;
      const started = Date.now();
      const end = () => {
        cancelled = true;
        window.cancelAnimationFrame(frame);
        for (const type of STOP_EVENTS) window.removeEventListener(type, end, true);
        if (stop === end) stop = null;
      };
      stop = end;
      let el: HTMLElement | null = null;
      let height = 0;
      let changedAt = 0;
      const tick = () => {
        if (cancelled) return;
        const now = Date.now();
        if (!el) {
          el = window.location.pathname === path ? document.getElementById(id) : null;
          if (!el) {
            if (now - started < WAIT_MS) frame = window.requestAnimationFrame(tick);
            else end();
            return;
          }
          height = document.documentElement.scrollHeight;
          changedAt = now;
          // A link within the page keeps the browser's smooth scroll; after a page change, jump at once
          if (!samePage) el.scrollIntoView({ block: "start", behavior: "instant" });
          for (const type of STOP_EVENTS) window.addEventListener(type, end, { capture: true, passive: true });
        } else {
          const h = document.documentElement.scrollHeight;
          if (h !== height) {
            height = h;
            changedAt = now;
            el.scrollIntoView({ block: "start", behavior: "instant" });
          }
        }
        if (now - changedAt > SETTLED_MS || now - started > MAX_MS) end();
        else frame = window.requestAnimationFrame(tick);
      };
      frame = window.requestAnimationFrame(tick);
    };

    const fromHash = (hash: string) => decodeURIComponent(hash.replace(/^#/, ""));

    const initial = fromHash(window.location.hash);
    if (initial) hold(initial, window.location.pathname, false);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self")) return;
      const url = new URL(a.href, window.location.href);
      const id = fromHash(url.hash);
      if (url.origin !== window.location.origin || !id) return;
      hold(id, url.pathname, url.pathname === window.location.pathname);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop?.();
    };
  }, []);

  return null;
}
