"use client";

import { useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Share the car page: Facebook, Viber, copy link, and the phone's share sheet (which also offers Instagram;
 * Instagram has no web link for sharing a page).
 */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  // false on the server, the real answer in the browser (no hydration mismatch)
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);

  const url = () => window.location.href;

  function openFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`, "_blank", "noopener,width=600,height=500");
  }

  function openViber() {
    window.location.href = `viber://forward?text=${encodeURIComponent(`${title} ${url()}`)}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function share() {
    try {
      await navigator.share({ title, url: url() });
    } catch {
      // closed by the user
    }
  }

  const button = "btn-ghost px-3! py-1.5! text-xs!";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">Сподели:</span>
      <button type="button" onClick={openFacebook} className={button}>
        Facebook
      </button>
      <button type="button" onClick={openViber} className={button}>
        Viber
      </button>
      {canShare && (
        <button type="button" onClick={share} className={button}>
          Instagram и други
        </button>
      )}
      <button type="button" onClick={copy} className={button}>
        {copied ? "Копирано ✓" : "Копирай линка"}
      </button>
    </div>
  );
}
