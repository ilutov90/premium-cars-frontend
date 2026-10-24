"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONSENT_EVENT,
  COOKIE_SETTINGS_EVENT,
  loadPixel,
  openCookieSettings,
  readConsent,
  rememberVisit,
  saveConsent,
  stopPixel,
  trackEvent,
  type CookieConsent,
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

/**
 * Remembers where the visit came from, asks for marketing cookies when the site has a Meta Pixel and runs the pixel
 * only after "Приемам". Without a pixel id (none saved under "Шаблони → Общи данни") the site sets no marketing
 * cookies and shows no banner. Not used in the admin panel.
 */
export function CookieConsentAndPixel({ pixelId }: { pixelId: string | null }) {
  const pathname = usePathname();
  const consent = useConsent();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const admin = pathname.startsWith("/admin");

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

  if (admin || consent === undefined) return null;
  const ask = settingsOpen || (!!pixelId && consent === null);
  if (!ask) return null;

  function choose(value: CookieConsent) {
    if (value === "necessary" && readConsent() === "marketing") stopPixel();
    saveConsent(value);
    setSettingsOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Бисквитки"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-2xl border border-line bg-card p-4 shadow-xl sm:p-5"
    >
      {pixelId ? (
        <>
          <p className="font-bold">Бисквитки</p>
          <p className="mt-1 text-sm text-muted">
            Сайтът използва само необходимите бисквитки. С ваше съгласие ползваме и бисквитки на Meta (Facebook и
            Instagram), за да измерваме рекламите си и да ви показваме коли, които сте разглеждали. Можете да промените
            избора си по всяко време от долната част на сайта.{" "}
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
