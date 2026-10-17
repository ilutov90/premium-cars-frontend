/* eslint-disable @next/next/no-img-element -- photos are served by our backend/CDN, already sized */

/** Car photo with a neutral placeholder when the car has no photos yet. */
export function CarImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-[repeating-linear-gradient(135deg,#ebe6de_0_12px,#e4dfd6_12px_24px)] ${className ?? ""}`}>
        <svg viewBox="0 0 64 32" className="w-1/3 text-muted/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 22h52M10 22l5-9c1-2 3-3 5-3h20c2 0 4 1 5 3l7 9M18 22a4 4 0 1 0 0 .1M46 22a4 4 0 1 0 0 .1" />
        </svg>
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
}
