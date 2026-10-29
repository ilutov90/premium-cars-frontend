"use client";
/* eslint-disable @next/next/no-img-element -- photos come from our backend or straight from the source site's CDN */

import { useEffect, useRef } from "react";

/**
 * A row of photos to swipe through with a finger (native scroll snapping, so it feels like the phone's own
 * gallery) and to step through with arrows on a computer. {@code index} follows the swipe through
 * {@code onIndex}; changing it from outside scrolls there.
 */
export function PhotoSwiper({
  images,
  alt,
  index,
  onIndex,
  onBroken,
  fit = "cover",
  arrows = "hover",
  className,
  onPhotoClick,
}: {
  images: string[];
  alt: string;
  index: number;
  onIndex: (i: number) => void;
  onBroken?: (src: string) => void;
  fit?: "cover" | "contain";
  /** "hover": shown on a computer when the pointer is over the photos; "always" (full screen) */
  arrows?: "hover" | "always";
  className?: string;
  onPhotoClick?: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const shown = useRef(index);

  // opened at a later photo (full screen): start there, without animation
  useEffect(() => {
    const el = track.current;
    if (el && shown.current > 0) el.scrollLeft = shown.current * el.clientWidth;
  }, []);

  // index changed from outside (thumbnails, keys): scroll there
  useEffect(() => {
    const el = track.current;
    if (!el || shown.current === index) return;
    shown.current = index;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }, [index]);

  function onScroll() {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== shown.current && i >= 0 && i < images.length) {
      shown.current = i;
      onIndex(i);
    }
  }

  function go(delta: number, e: React.MouseEvent) {
    // the swiper can sit inside a link (car cards): an arrow must not open it
    e.preventDefault();
    e.stopPropagation();
    onIndex((index + delta + images.length) % images.length);
  }

  const arrowClass =
    arrows === "always"
      ? "grid h-12 w-12 bg-paper/10 text-2xl text-paper hover:bg-paper/20"
      : "hidden h-9 w-9 bg-paper/90 text-xl text-ink opacity-0 shadow transition group-hover/swiper:opacity-100 sm:grid";

  return (
    <div className={`group/swiper relative ${className ?? ""}`}>
      <div
        ref={track}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((src, i) => (
          <div key={src} className="h-full w-full shrink-0 snap-center snap-always">
            <img
              src={src}
              alt={`${alt} — снимка ${i + 1}`}
              // the first photos load at once, the rest when they come close
              loading={Math.abs(i - index) <= 1 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => onBroken?.(src)}
              onClick={onPhotoClick}
              className={`h-full w-full ${fit === "cover" ? "object-cover" : "object-contain"} ${
                onPhotoClick ? "cursor-zoom-in" : ""
              }`}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Предишна снимка"
            onClick={(e) => go(-1, e)}
            className={`absolute top-1/2 left-3 -translate-y-1/2 place-items-center rounded-full ${arrowClass}`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Следваща снимка"
            onClick={(e) => go(1, e)}
            className={`absolute top-1/2 right-3 -translate-y-1/2 place-items-center rounded-full ${arrowClass}`}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
