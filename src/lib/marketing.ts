// Browser-side marketing helpers: where a visitor came from (sent with an inquiry), the cookie choice and the Meta
// Pixel. Used only from client components. Every storage access is wrapped: private windows and blocked storage
// must never break the site.
import type { Attribution } from "./types";

const ATTRIBUTION_KEY = "pc-attribution";
const CONSENT_KEY = "pc-cookie-consent";
/** Fired on window when the cookie choice changes or the settings are opened from a link. */
export const CONSENT_EVENT = "pc-consent-change";
export const COOKIE_SETTINGS_EVENT = "pc-cookie-settings";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

/**
 * Remembers how this visit started, for this browser tab only (sessionStorage, gone when the tab closes; nothing
 * leaves the browser until the visitor sends an inquiry). A link with UTM parameters replaces what was kept; other
 * pages keep the first one.
 */
export function rememberVisit(): void {
  try {
    const url = new URL(window.location.href);
    const hasUtm = UTM_KEYS.some((k) => url.searchParams.get(k));
    if (!hasUtm && sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    let referrer: string | null = null;
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host && host !== window.location.host) referrer = host;
    }
    const value: Attribution = {
      utmSource: url.searchParams.get("utm_source"),
      utmMedium: url.searchParams.get("utm_medium"),
      utmCampaign: url.searchParams.get("utm_campaign"),
      utmContent: url.searchParams.get("utm_content"),
      landingPath: (url.pathname + url.search).slice(0, 300),
      referrer,
    };
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
  } catch {
    // storage blocked or a malformed referrer: nothing to remember
  }
}

/** What rememberVisit kept, or null. */
export function visitAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** "marketing" = the visitor accepted marketing cookies (Meta Pixel); "necessary" = refused; null = not asked yet. */
export type CookieConsent = "marketing" | "necessary";

export function readConsent(): CookieConsent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "marketing" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

export function saveConsent(value: CookieConsent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // not kept: the banner asks again next time
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT));
}

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Loads Meta's pixel script once (Meta's standard snippet) and starts the pixel. Only after consent. */
export function loadPixel(pixelId: string): void {
  if (window.fbq) {
    window.fbq("consent", "grant");
    return;
  }
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", pixelId);
}

/** Stops the pixel after the visitor withdrew consent and removes Meta's first-party cookies. */
export function stopPixel(): void {
  window.fbq?.("consent", "revoke");
  for (const name of ["_fbp", "_fbc"]) {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname.replace(/^www\./, "")}`;
  }
}

/** Sends a pixel event when the pixel runs (consent given); otherwise nothing. */
export function trackEvent(event: "PageView" | "Lead" | "Contact", params?: Record<string, unknown>): void {
  if (readConsent() !== "marketing") return;
  window.fbq?.("track", event, params);
}
