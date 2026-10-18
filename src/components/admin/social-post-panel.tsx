"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "./admin-context";
import { socialPostText, viberPostText } from "@/lib/description";
import { formatDate, listingId as sourceListingId } from "@/lib/format";
import type { AdminCar, Origin, SocialNetwork, SocialPost, SocialStatus, ViberConnectResponse } from "@/lib/types";

const originOf = (car: AdminCar): Origin | null =>
  car.source === "AUTOHOME" ? "CN" : car.source === "AUTOWINI" ? "KR" : null;

const networkLabels: Record<SocialNetwork, string> = { FACEBOOK: "Facebook", INSTAGRAM: "Instagram", VIBER: "Viber" };
const INSTAGRAM_CAPTION_MAX = 2200;
const VIBER_TEXT_MAX = 7000;
const MAX_PHOTOS = 10;
const VIBER_PHOTO_CHOICES = [3, 5, 8, 10, 15, 20];

/** The generated post text for the car (editable), publishing to Facebook/Instagram/Viber, sharing and the list of posts. */
export function SocialPostPanel({ car }: { car: AdminCar }) {
  const { adminFetch } = useAdmin();
  const listingId = sourceListingId(car.source, car.sourceRef);
  const generated = socialPostText(car.specs, originOf(car), car.price?.totalEur ?? null, listingId);
  const generatedViber = viberPostText(car.specs, originOf(car), car.price?.totalEur ?? null, listingId);

  const [text, setText] = useState(generated);
  const [viberText, setViberText] = useState(generatedViber);
  const [viberPhotos, setViberPhotos] = useState(Math.min(10, Math.max(1, car.images.length)));
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    adminFetch<SocialStatus>("/api/admin/social/status").then(setStatus).catch(() => setStatus(null));
    adminFetch<SocialPost[]>(`/api/admin/cars/${car.id}/social-posts`).then(setPosts).catch(() => setPosts([]));
  }, [adminFetch, car.id]);

  async function publish(network: SocialNetwork) {
    const isViber = network === "VIBER";
    const earlier = posts.find((p) => p.network === network);
    if (earlier && !window.confirm(`Колата вече е публикувана в ${networkLabels[network]} на ${formatDate(earlier.createdAt)}. Публикувай отново?`)) {
      return;
    }
    setBusy(network);
    setMessage(null);
    try {
      const post = await adminFetch<SocialPost>(`/api/admin/cars/${car.id}/social-posts`, {
        method: "POST",
        body: JSON.stringify(
          isViber ? { network, text: viberText, photoCount: viberPhotos } : { network, text },
        ),
      });
      setPosts((list) => [post, ...list]);
      setMessage({ ok: true, text: `Публикувано в ${networkLabels[network]} ✓ (${post.photos} снимки)` });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ ok: true, text: "Текстът е копиран ✓" });
    } catch {
      setMessage({ ok: false, text: "Неуспешно копиране" });
    }
  }

  /** The phone's / Windows share sheet with the photos and the text (e.g. to the Instagram or Facebook app). */
  async function shareWithPhotos() {
    setBusy("share");
    setMessage(null);
    try {
      const files = await photoFiles(car);
      const data: ShareData = { text, files };
      if (!navigator.canShare?.(data)) {
        throw new Error("Този браузър не може да споделя снимки. Използвай „Свали снимките“ и „Копирай текста“.");
      }
      await navigator.clipboard.writeText(text).catch(() => undefined); // Instagram ignores shared text
      await navigator.share(data);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
      }
    } finally {
      setBusy(null);
    }
  }

  async function downloadPhotos() {
    setBusy("download");
    try {
      for (const file of await photoFiles(car)) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    } finally {
      setBusy(null);
    }
  }

  const tooLongForInstagram = text.length > INSTAGRAM_CAPTION_MAX;
  const tooLongForViber = viberText.length > VIBER_TEXT_MAX;
  const noPhotos = car.images.length === 0;

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold">Социални мрежи</h2>
        <div className="flex gap-1.5">
          {text !== generated && (
            <button type="button" onClick={() => setText(generated)} className="btn-ghost px-3! py-1.5! text-xs!">
              Възстанови
            </button>
          )}
          <button type="button" onClick={copy} className="btn-ghost px-3! py-1.5! text-xs!">
            Копирай текста
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="field font-mono text-xs! leading-relaxed"
        aria-label="Текст за публикация"
      />
      <p className={`mt-1 text-xs ${tooLongForInstagram ? "font-semibold text-warn" : "text-muted"}`}>
        {text.length} знака{tooLongForInstagram ? ` — над лимита на Instagram (${INSTAGRAM_CAPTION_MAX})` : ""}.
        Генерира се от данните след „Запиши“; можеш да го редактираш преди публикуване.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-primary px-3! py-2! text-sm!"
          disabled={!status?.facebook || noPhotos || busy !== null}
          onClick={() => publish("FACEBOOK")}
        >
          {busy === "FACEBOOK" ? "Публикуване…" : "Публикувай във Facebook"}
        </button>
        <button
          type="button"
          className="btn-primary px-3! py-2! text-sm!"
          disabled={!status?.instagram || noPhotos || tooLongForInstagram || busy !== null}
          onClick={() => publish("INSTAGRAM")}
        >
          {busy === "INSTAGRAM" ? "Публикуване…" : "Публикувай в Instagram"}
        </button>
      </div>
      {status && (!status.facebook || !status.instagram || !status.viber) && (
        <p className="mt-2 text-xs text-muted">
          {!status.facebook && "Facebook не е настроен (FB_PAGE_ID, FB_ACCESS_TOKEN). "}
          {!status.instagram && "Instagram не е настроен (IG_USER_ID, FB_ACCESS_TOKEN, IMGBB_API_KEY). "}
          {!status.viber && "Viber не е настроен (VIBER_CHANNEL_TOKEN, IMGBB_API_KEY). "}
          Виж README на бекенда.
        </p>
      )}
      <p className="mt-1 text-xs text-muted">Публикуват се до {MAX_PHOTOS} снимки в реда от галерията.</p>

      <div className="mt-4 border-t border-line pt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">Viber канал</h3>
          {viberText !== generatedViber && (
            <button type="button" onClick={() => setViberText(generatedViber)} className="btn-ghost px-3! py-1.5! text-xs!">
              Възстанови
            </button>
          )}
        </div>
        <textarea
          value={viberText}
          onChange={(e) => setViberText(e.target.value)}
          rows={8}
          className="field font-mono text-xs! leading-relaxed"
          aria-label="Текст за Viber"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="text-xs text-muted" htmlFor="viber-photos">
            Снимки (първите от галерията):
          </label>
          <select
            id="viber-photos"
            value={viberPhotos}
            onChange={(e) => setViberPhotos(Number(e.target.value))}
            className="field w-auto! py-1! text-xs!"
          >
            {Array.from(new Set([...VIBER_PHOTO_CHOICES, viberPhotos]))
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                  {n > car.images.length ? ` (има ${car.images.length})` : ""}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn-primary ml-auto px-3! py-2! text-sm!"
            disabled={!status?.viber || noPhotos || tooLongForViber || busy !== null}
            onClick={() => publish("VIBER")}
          >
            {busy === "VIBER" ? "Публикуване във Viber…" : "Публикувай във Viber"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Всяка снимка е отделно съобщение в канала, а след тях текстът. Редът е като в галерията (корицата е първа).
        </p>
        {status?.viber && <ViberConnect onMessage={setMessage} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" disabled={noPhotos || busy !== null} onClick={shareWithPhotos}>
          {busy === "share" ? "Подготовка…" : "Сподели със снимките"}
        </button>
        <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" disabled={noPhotos || busy !== null} onClick={downloadPhotos}>
          {busy === "download" ? "Сваляне…" : "Свали снимките"}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm font-semibold break-words ${message.ok ? "text-ok" : "text-warn"}`}>{message.text}</p>
      )}

      {posts.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
          {posts.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>
                {networkLabels[p.network]} · {formatDate(p.createdAt)} · {p.photos} снимки
              </span>
              {p.permalink && (
                <a href={p.permalink} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">
                  виж ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Viber accepts channel posts only after a callback URL is registered, and checks it right away: the site must be
 * reachable over HTTPS (locally through a temporary tunnel such as cloudflared). Needed once per channel.
 */
function ViberConnect({ onMessage }: { onMessage: (m: { ok: boolean; text: string }) => void }) {
  const { adminFetch } = useAdmin();
  const [siteUrl, setSiteUrl] = useState(() =>
    typeof window !== "undefined" && window.location.protocol === "https:" ? window.location.origin : "",
  );
  const [busy, setBusy] = useState(false);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await adminFetch<ViberConnectResponse>("/api/admin/social/viber/connect", {
        method: "POST",
        body: JSON.stringify({ siteUrl }),
      });
      onMessage({ ok: true, text: `Viber каналът е свързан ✓ (${r.callbackUrl})` });
    } catch (err) {
      onMessage({ ok: false, text: err instanceof Error ? err.message : "Грешка" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-line p-3 text-xs">
      <summary className="cursor-pointer font-semibold">Свържи Viber канала (еднократно)</summary>
      <p className="mt-2 text-muted">
        Viber приема публикации само след като провери публичен https адрес на сайта. Локално: пусни{" "}
        <code>cloudflared tunnel --url http://localhost:3000</code> и постави адреса, който показва
        (https://….trycloudflare.com). Нужно е само веднъж.
      </p>
      <form onSubmit={connect} className="mt-2 flex gap-2">
        <input
          type="url"
          required
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          placeholder="https://….trycloudflare.com"
          className="field flex-1 py-1.5! text-xs!"
          aria-label="Публичен адрес на сайта"
        />
        <button type="submit" className="btn-ghost px-3! py-1.5! text-xs!" disabled={busy}>
          {busy ? "Свързване…" : "Свържи"}
        </button>
      </form>
    </details>
  );
}

/** The car's photos as files, in gallery order (the same ones the publish buttons send). */
async function photoFiles(car: AdminCar): Promise<File[]> {
  const files: File[] = [];
  for (const [i, img] of car.images.slice(0, MAX_PHOTOS).entries()) {
    const res = await fetch(img.url);
    if (!res.ok) throw new Error(`Снимка ${i + 1} не се зареди (${res.status})`);
    const blob = await res.blob();
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    files.push(new File([blob], `${car.slug}-${String(i + 1).padStart(2, "0")}.${ext}`, { type: blob.type || "image/jpeg" }));
  }
  return files;
}
