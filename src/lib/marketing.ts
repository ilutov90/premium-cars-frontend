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
/** Google Ads' click ids: auto-tagged ad clicks carry one of them instead of UTM parameters. */
const GOOGLE_CLICK_KEYS = ["gclid", "gbraid", "wbraid"] as const;

/**
 * Remembers how this visit started, for this browser tab only (sessionStorage, gone when the tab closes; nothing
 * leaves the browser until the visitor sends an inquiry). A link with UTM parameters (or a Google Ads click id)
 * replaces what was kept; other pages keep the first one. A Google Ads click without utm_source counts as
 * google / cpc, so the inquiry report shows it under Google.
 */
export function rememberVisit(): void {
  try {
    const url = new URL(window.location.href);
    const hasUtm = UTM_KEYS.some((k) => url.searchParams.get(k));
    const googleClick = GOOGLE_CLICK_KEYS.some((k) => url.searchParams.get(k));
    if (!hasUtm && !googleClick && sessionStorage.getItem(ATTRIBUTION_KEY)) return;
    let referrer: string | null = null;
    if (document.referrer) {
      const host = new URL(document.referrer).host;
      if (host && host !== window.location.host) referrer = host;
    }
    const adClick = googleClick && !url.searchParams.get("utm_source");
    const value: Attribution = {
      utmSource: adClick ? "google" : url.searchParams.get("utm_source"),
      utmMedium: adClick ? "cpc" :url.searchParams.get("utm_medium"),
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
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
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

/** The Google tag's ids saved under "Шаблони → Общи данни" (backend PostSettings); null = not used. */
export interface GoogleTagConfig {
  adsId: string | null;
  analyticsId: string | null;
  leadLabel: string | null;
  phoneLabel: string | null;
  viberLabel: string | null;
}

export type GoogleConversion = "lead" | "phone" | "viber";

/** The config the tag was loaded with (null until loaded after consent). */
let googleTag: GoogleTagConfig | null = null;

const CONSENT_TYPES = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const;
const consentState = (value: "granted" | "denied") =>
  Object.fromEntries(CONSENT_TYPES.map((k) => [k, value])) as Record<(typeof CONSENT_TYPES)[number], string>;

/**
 * Loads Google's tag (gtag.js) once, only after consent, for the Ads and/or Analytics id; `config` sends the first
 * page's page_view. Consent Mode v2: everything denied by default, then granted, since the visitor already accepted.
 * Returns true when this call loaded the tag (false: already loaded and only granted again, or no id). A blocked
 * script leaves the stub queueing into dataLayer: nothing throws.
 */
export function loadGoogleTag(config: GoogleTagConfig): boolean {
  const ids = [config.adsId, config.analyticsId].filter((id): id is string => !!id);
  if (!ids.length) return false;
  googleTag = config;
  if (window.gtag) {
    window.gtag("consent", "update", consentState("granted"));
    return false;
  }
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag.js reads the Arguments object itself, not an array
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", consentState("denied"));
  window.gtag("consent", "update", consentState("granted"));
  window.gtag("js", new Date());
  for (const id of ids) window.gtag("config", id);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ids[0])}`;
  document.head.appendChild(script);
  return true;
}

/** Stops the Google tag after the visitor withdrew consent and removes Google's first-party cookies. */
export function stopGoogleTag(): void {
  try {
    window.gtag?.("consent", "update", consentState("denied"));
    const domain = window.location.hostname.replace(/^www\./, "");
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!/^(_ga|_gcl|_gid)/.test(name)) continue;
      document.cookie = `${name}=; Max-Age=0; path=/`;
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
    }
  } catch {
    // nothing to stop
  }
}

/**
 * A page_view for Google Ads after a client-side page change (the first page's comes from `config`). Sent only to
 * the Ads id: GA4's enhanced measurement already counts history changes itself.
 */
export function trackGooglePageView(): void {
  if (readConsent() !== "marketing" || !googleTag?.adsId) return;
  try {
    window.gtag?.("event", "page_view", { send_to: googleTag.adsId });
  } catch {
    // tag broken or blocked: nothing to send
  }
}

/** A Google Ads conversion (and GA4's generate_lead for an inquiry) when the tag runs and the label is set. */
export function trackGoogleConversion(kind: GoogleConversion): void {
  if (readConsent() !== "marketing" || !googleTag || !window.gtag) return;
  try {
    const label = { lead: googleTag.leadLabel, phone: googleTag.phoneLabel, viber: googleTag.viberLabel }[kind];
    if (googleTag.adsId && label) window.gtag("event", "conversion", { send_to: `${googleTag.adsId}/${label}` });
    if (kind === "lead" && googleTag.analyticsId) {
      window.gtag("event", "generate_lead", { send_to: googleTag.analyticsId });
    }
  } catch {
    // tag broken or blocked: the inquiry itself is already sent
  }
}
