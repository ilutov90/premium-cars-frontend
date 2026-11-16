"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CONSENT_EVENT,
  COOKIE_SETTINGS_EVENT,
  loadGoogleTag,
  loadPixel,
  openCookieSettings,
  readConsent,
  rememberVisit,
  saveConsent,
  stopGoogleTag,
  stopPixel,
  trackEvent,
  trackGoogleConversion,
  trackGooglePageView,
  type CookieConsent,
  type GoogleConversion,
  type GoogleTagConfig,
} from "@/lib/marketing";

function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** undefined on the server (no banner in the prerendered HTML), the stored choice in the browser. */
function useConsent(): CookieConsent | null | undefined {
  return useSyncExternalStore(subscribeConsent, readConsent, () => undefined);
}

/** Viber's own link hosts (channel invites, short links), besides the viber: scheme and the saved Viber link. */
const VIBER_HOSTS = /(^|\.)(viber\.com|vb\.me)$/i;

const normalizeLink = (href: string) => href.trim().replace(/\/+$/, "").toLowerCase();

/** Which Google Ads conversion a click on this link is: a phone call, a Viber chat/channel, or none. */
function clickConversion(href: string, viberLink: string | null): GoogleConversion | null {
  const value = href.trim().toLowerCase();
  if (value.startsWith("tel:")) return "phone";
  if (value.startsWith("viber:")) return "viber";
  if (viberLink && normalizeLink(href) === normalizeLink(viberLink)) return "viber";
  try {
    const url = new URL(href, window.location.href);
    if ((url.protocol === "https:" || url.protocol === "http:") && VIBER_HOSTS.test(url.hostname)) return "viber";
  } catch {
    // not a URL
  }
  return null;
}

export type CookieConsentProps = {
  pixelId: string | null;
  googleAdsId: string | null;
  googleAnalyticsId: string | null;
  googleLeadLabel: string | null;
  googlePhoneLabel: string | null;
  googleViberLabel: string | null;
  /** The Viber channel link the site shows (saved or built-in), so a click on it counts as a Viber conversion. */
  viberLink: string | null;
};

/**
 * Remembers where the visit came from, asks for marketing cookies when the site has a Meta Pixel or a Google Ads /
 * Analytics id and runs them only after "Приемам". Without any id (none saved under "Шаблони → Общи данни") the site
 * sets no marketing cookies and shows no banner. Not used in the admin panel.
 */
export function CookieConsentAndPixel({
  pixelId,
  googleAdsId,
  googleAnalyticsId,
  googleLeadLabel,
  googlePhoneLabel,
  googleViberLabel,
  viberLink,
}: CookieConsentProps) {
  const pathname = usePathname();
  const consent = useConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const admin = pathname.startsWith("/admin");
  const hasGoogle = !!googleAdsId || !!googleAnalyticsId;
  const tracked = !!pixelId || hasGoogle;

  useEffect(() => {
    if (!admin) rememberVisit();
  }, [admin, pathname]);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    window.addEventListener(COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, open);
  }, []);

  const pixelOn = !admin && !!pixelId && consent === "marketing";
  useEffect(() => {
    if (pixelOn && pixelId) loadPixel(pixelId);
  }, [pixelOn, pixelId]);

  // one PageView per page (the App Router changes pages without reloading)
  useEffect(() => {
    if (pixelOn) trackEvent("PageView");
  }, [pixelOn, pathname]);

  // Google: loaded on the first page with consent (its `config` sends that page's page_view), then one page_view
  // per later page change for Ads; GA4 counts page changes itself (enhanced measurement)
  const googleOn = !admin && hasGoogle && consent === "marketing";
  const googlePath = useRef<string | null>(null);
  useEffect(() => {
    if (!googleOn) {
      googlePath.current = null;
      return;
    }
    if (googlePath.current === null) {
      const config: GoogleTagConfig = {
        adsId: googleAdsId,
        analyticsId: googleAnalyticsId,
        leadLabel: googleLeadLabel,
        phoneLabel: googlePhoneLabel,
        viberLabel: googleViberLabel,
      };
      // a tag loaded earlier in this tab (consent withdrawn and given again) only gets the grant back
      loadGoogleTag(config);
      googlePath.current = pathname;
      return;
    }
    if (googlePath.current !== pathname) {
      googlePath.current = pathname;
      trackGooglePageView();
    }
  }, [googleOn, pathname, googleAdsId, googleAnalyticsId, googleLeadLabel, googlePhoneLabel, googleViberLabel]);

  // phone and Viber clicks anywhere on the site: one listener, never delaying the link
  const hasClickLabels = !!googleAdsId && (!!googlePhoneLabel || !!googleViberLabel);
  useEffect(() => {
    if (!googleOn || !hasClickLabels) return;
    function onClick(e: MouseEvent) {
      try {
        const target = e.target instanceof Element ? e.target : null;
        const href = target?.closest("a[href]")?.getAttribute("href");
        const kind = href ? clickConversion(href, viberLink) : null;
        if (kind) trackGoogleConversion(kind);
      } catch {
        // tracking must never break a click
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [googleOn, hasClickLabels, viberLink]);

  if (admin || consent === undefined) return null;
  const ask = settingsOpen || (tracked && consent === null);
  if (!ask) return null;

  function choose(value: CookieConsent) {
    if (value === "necessary" && readConsent() === "marketing") {
      stopPixel();
      stopGoogleTag();
    }
    saveConsent(value);
    setSettingsOpen(false);
  }

  const companies = [pixelId ? "Meta (Facebook и Instagram)" : null, hasGoogle ? "Google" : null].filter(Boolean);

  return (
    <div
      role="dialog"
      aria-label="Бисквитки"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-card p-4 shadow-xl sm:p-5"
    >
      {tracked ? (
        <>
          <p className="font-bold">Бисквитки</p>
          <p className="mt-1 text-sm text-muted">
            Сайтът използва само необходимите бисквитки. С ваше съгласие ползваме и бисквитки на{" "}
            {companies.join(" и ")}, за да измерваме рекламите си и да ви показваме коли, които сте разглеждали. Можете
            да промените избора си по всяко време от долната част на сайта.{" "}
            <Link href="/privacy#cookies" className="font-semibold text-ink underline underline-offset-2">
              Повече
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-accent px-5! py-2! text-sm!" onClick={() => choose("marketing")}>
              Приемам
            </button>
            <button type="button" className="btn-ghost px-5! py-2! text-sm!" onClick={() => choose("necessary")}>
              Само необходимите
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="font-bold">Бисквитки</p>
          <p className="mt-1 text-sm text-muted">
            В момента сайтът използва само необходимите бисквитки и не следи посещенията ви за реклама.
          </p>
          <button type="button" className="btn-ghost mt-3 px-5! py-2! text-sm!" onClick={() => setSettingsOpen(false)}>
            Затвори
          </button>
        </>
      )}
    </div>
  );
}

/** "Настройки за бисквитки" link (footer, privacy policy): opens the banner again. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Настройки за бисквитки
    </button>
  );
}
