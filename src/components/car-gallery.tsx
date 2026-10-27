"use client";
/* eslint-disable @next/next/no-img-element -- photos are served by our backend/CDN */

import { useCallback, useEffect, useState } from "react";
import { CarImage } from "./car-image";

export function CarGallery({ images: all, title }: { images: string[]; title: string }) {
  // photos that did not load (a linked photo removed at the source) are left out
  const [broken, setBroken] = useState<string[]>([]);
  const images = all.filter((src) => !broken.includes(src));
  const hide = (src: string) => setBroken((b) => (b.includes(src) ? b : [...b, src]));
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;

  const step = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (count === 0) {
    return <CarImage src={null} alt={title} className="aspect-[4/3] w-full rounded-2xl" />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-line/50"
        aria-label="Отвори снимките на цял екран"
      >
        <img
          src={images[Math.min(active, count - 1)]}
          alt={`${title} — снимка ${active + 1}`}
          referrerPolicy="no-referrer"
          onError={() => hide(images[Math.min(active, count - 1)])}
          className="h-full w-full object-cover"
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-3 py-1 text-xs font-semibold text-paper">
          {active + 1} / {count}
        </span>
      </button>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Снимка ${i + 1}`}
            >
              <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => hide(src)} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <img
            src={images[Math.min(active, count - 1)]}
            referrerPolicy="no-referrer"
            alt={`${title} — снимка ${active + 1}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {count > 1 && (
            <>
              <GalleryArrow side="left" onClick={() => step(-1)} />
              <GalleryArrow side="right" onClick={() => step(1)} />
            </>
          )}
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-paper/10 px-4 py-2 text-sm font-semibold text-paper hover:bg-paper/20"
            onClick={() => setOpen(false)}
          >
            Затвори ✕
          </button>
        </div>
      )}
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Предишна" : "Следваща"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "left-4" : "right-4"} grid h-12 w-12 place-items-center rounded-full bg-paper/10 text-2xl text-paper hover:bg-paper/20`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
