"use client";

import { useCallback, useState } from "react";
import { CarImage } from "./car-image";
import { PhotoSwiper } from "./photo-swiper";

/** A car card's photos: swipe through them (or the arrows on a computer) without leaving the catalog. */
export function CardPhotos({ images: all, alt, className }: { images: string[]; alt: string; className?: string }) {
  const [broken, setBroken] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const hide = useCallback((src: string) => setBroken((b) => (b.includes(src) ? b : [...b, src])), []);
  const images = all.filter((src) => !broken.includes(src));
  if (images.length <= 1) {
    return <CarImage src={images[0]} alt={alt} className={`h-full w-full object-cover ${className ?? ""}`} />;
  }
  const current = Math.min(index, images.length - 1);
  return (
    <>
      <PhotoSwiper
        images={images}
        alt={alt}
        index={current}
        onIndex={setIndex}
        onBroken={hide}
        className="h-full w-full"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
        {images.map((src, i) => (
          <span
            key={src}
            className={`h-1.5 rounded-full bg-paper shadow transition-all ${i === current ? "w-4" : "w-1.5 opacity-60"}`}
          />
        ))}
      </div>
    </>
  );
}
