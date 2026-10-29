"use client";
/* eslint-disable @next/next/no-img-element -- photos are served by our backend/CDN */

import { useCallback, useEffect, useState } from "react";
import { CarImage } from "./car-image";
import { PhotoSwiper } from "./photo-swiper";

/** The car page's photos: swipe or step through them, thumbnails below, full screen on a tap (swipeable too). */
export function CarGallery({ images: all, title }: { images: string[]; title: string }) {
  // photos that did not load (a linked photo removed at the source) are left out
  const [broken, setBroken] = useState<string[]>([]);
  const images = all.filter((src) => !broken.includes(src));
  const hide = useCallback((src: string) => setBroken((b) => (b.includes(src) ? b : [...b, src])), []);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const current = Math.min(active, Math.max(count - 1, 0));

  const step = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    // the page behind does not scroll while the photos are open
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, step]);

  if (count === 0) {
    return <CarImage src={null} alt={title} className="aspect-[4/3] w-full rounded-2xl" />;
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-line/50">
        <PhotoSwiper
          images={images}
          alt={title}
          index={current}
          onIndex={setActive}
          onBroken={hide}
          onPhotoClick={() => setOpen(true)}
          className="h-full w-full"
        />
        <span className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-paper">
          {current + 1} / {count}
        </span>
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === current ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Снимка ${i + 1}`}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => hide(src)}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/95" role="dialog" aria-modal="true" aria-label={title}>
          <div className="flex items-center justify-between px-4 py-3 text-paper">
            <span className="text-sm font-semibold">
              {current + 1} / {count}
            </span>
            <button
              type="button"
              className="rounded-full bg-paper/10 px-4 py-2 text-sm font-semibold hover:bg-paper/20"
              onClick={() => setOpen(false)}
            >
              Затвори ✕
            </button>
          </div>
          <PhotoSwiper
            images={images}
            alt={title}
            index={current}
            onIndex={setActive}
            onBroken={hide}
            fit="contain"
            arrows="always"
            className="min-h-0 flex-1 pb-4"
          />
        </div>
      )}
    </div>
  );
}
