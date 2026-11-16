import type { CSSProperties } from "react";
import type { SiteLogo } from "./types";

export const LOGO_DEFAULT_HEIGHT = 40;
/** The header bar is 64 px high (h-16); the logo keeps 4 px of air above and below. */
export const LOGO_MAX_HEIGHT = 56;
export const LOGO_RANGES = {
  height: { min: 24, max: 56 },
  radius: { min: 0, max: 32 },
  feather: { min: 0, max: 40 },
} as const;

export type LogoStyle = Partial<Pick<SiteLogo, "height" | "radius" | "feather">>;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * The inline style of the logo image, shared by the site header and the admin preview.
 * feather = percent of the image's size over which every edge fades to transparent: two linear-gradient masks (left-right and
 * top-bottom) intersected; 0 = no mask. Both the standard and the -webkit- forms are set (Safari needs the latter).
 */
export function logoImageStyle(s: LogoStyle | null | undefined): CSSProperties {
  const height = clamp(s?.height ?? LOGO_DEFAULT_HEIGHT, LOGO_RANGES.height.min, LOGO_MAX_HEIGHT);
  const style: CSSProperties = { height: `${height}px` };
  const radius = clamp(s?.radius ?? 0, LOGO_RANGES.radius.min, LOGO_RANGES.radius.max);
  if (radius > 0) style.borderRadius = `${radius}px`;
  const feather = clamp(s?.feather ?? 0, LOGO_RANGES.feather.min, LOGO_RANGES.feather.max);
  if (feather > 0) {
    // each edge fades over `feather` percent of the size, the fades of the two axes meeting in the middle at most (50%)
    const f = Math.min(feather, 50);
    const mask = `linear-gradient(to right, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%)`;
    style.maskImage = mask;
    style.WebkitMaskImage = mask;
    style.maskComposite = "intersect";
    style.WebkitMaskComposite = "source-in";
  }
  return style;
}
