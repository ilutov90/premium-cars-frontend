"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "./admin-context";
import { CarImage } from "@/components/car-image";
import { formatDate } from "@/lib/format";
import { defaultTemplates, networkLabels, renderTemplate, templateValues } from "@/lib/post-template";
import type { AdminCar, PostTemplate, SocialNetwork, SocialPost, SocialStatus, ViberConnectResponse } from "@/lib/types";

/** Text limits of the networks (Facebook allows far more; 5000 keeps posts readable). */
const TEXT_MAX: Record<SocialNetwork, number> = { FACEBOOK: 5000, INSTAGRAM: 2200, VIBER: 7000 };
const MAX_PHOTOS = 10;
const networks: SocialNetwork[] = ["FACEBOOK", "INSTAGRAM", "VIBER"];

type Message = { ok: boolean; text: string };

/** Publishing the car to Facebook / Instagram / Viber (through a confirmation step), sharing and earlier posts. */
export function SocialPostPanel({ car }: { car: AdminCar }) {
  const { adminFetch } = useAdmin();
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const [templates, setTemplates] = useState<Record<SocialNetwork, string>>(defaultTemplates);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [dialog, setDialog] = useState<SocialNetwork | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    adminFetch<SocialStatus>("/api/admin/social/status").then(setStatus).catch(() => setStatus(null));
    adminFetch<SocialPost[]>(`/api/admin/cars/${car.id}/social-posts`).then(setPosts).catch(() => setPosts([]));
    adminFetch<PostTemplate[]>("/api/admin/post-templates")
      .then((list) => {
        const t = { ...defaultTemplates };
        for (const saved of list) t[saved.network] = saved.body;
        setTemplates(t);
      })
      .catch(() => undefined);
  }, [adminFetch, car.id]);

  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const textFor = (network: SocialNetwork) => renderTemplate(templates[network], templateValues(car, origin));
  const noPhotos = car.images.length === 0;
  const configured = (n: SocialNetwork) =>
    n === "FACEBOOK" ? status?.facebook : n === "INSTAGRAM" ? status?.instagram : status?.viber;

  async function copy() {
    try {
      await navigator.clipboard.writeText(textFor("FACEBOOK"));
      setMessage({ ok: true, text: "Текстът (Facebook шаблон) е копиран ✓" });
    } catch {
      setMessage({ ok: false, text: "Неуспешно копиране" });
    }
  }

  /** The phone's / Windows share sheet with the photos and the text (e.g. to the Instagram or Facebook app). */
  async function shareWithPhotos() {
    setBusy("share");
    setMessage(null);
    try {
      const text = textFor("FACEBOOK");
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

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold">Социални мрежи</h2>
        <Link href="/admin/templates" className="text-xs font-semibold text-accent hover:underline">
          Шаблони
        </Link>
      </div>

      <div className="grid gap-2">
        {networks.map((n) => (
          <button
            key={n}
            type="button"
            className="btn-primary px-3! py-2! text-sm!"
            disabled={!configured(n) || noPhotos || busy !== null}
            onClick={() => {
              setMessage(null);
              setDialog(n);
            }}
          >
            Публикувай в{n === "FACEBOOK" || n === "VIBER" ? "ъв" : ""} {networkLabels[n]}…
          </button>
        ))}
      </div>
      {status && (!status.facebook || !status.instagram || !status.viber) && (
        <p className="mt-2 text-xs text-muted">
          {!status.facebook && "Facebook не е настроен (FB_PAGE_ID, FB_ACCESS_TOKEN). "}
          {!status.instagram && "Instagram не е настроен (IG_USER_ID, FB_ACCESS_TOKEN, IMGBB_API_KEY). "}
          {!status.viber && "Viber не е настроен (VIBER_CHANNEL_TOKEN, IMGBB_API_KEY). "}
          Виж README на бекенда.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Преди публикуване се показват текстът от шаблона (може да се промени) и снимките за избор.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="btn-ghost px-3! py-1.5! text-xs!">
          Копирай текста
        </button>
        <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" disabled={noPhotos || busy !== null} onClick={shareWithPhotos}>
          {busy === "share" ? "Подготовка…" : "Сподели със снимките"}
        </button>
        <button type="button" className="btn-ghost px-3! py-1.5! text-xs!" disabled={noPhotos || busy !== null} onClick={downloadPhotos}>
          {busy === "download" ? "Сваляне…" : "Свали снимките"}
        </button>
      </div>

      {status?.viber && <ViberConnect onMessage={setMessage} />}

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

      {dialog && (
        <PublishDialog
          car={car}
          network={dialog}
          initialText={textFor(dialog)}
          earlier={posts.find((p) => p.network === dialog) ?? null}
          onClose={() => setDialog(null)}
          onPublished={(post) => {
            setPosts((list) => [post, ...list]);
            setDialog(null);
            setMessage({ ok: true, text: `Публикувано в ${networkLabels[post.network]} ✓ (${post.photos} снимки)` });
          }}
        />
      )}
    </section>
  );
}

/** The confirmation step: the text from the template (editable) and the photos to send (1 to 10, gallery order). */
function PublishDialog({
  car,
  network,
  initialText,
  earlier,
  onClose,
  onPublished,
}: {
  car: AdminCar;
  network: SocialNetwork;
  initialText: string;
  earlier: SocialPost | null;
  onClose: () => void;
  onPublished: (post: SocialPost) => void;
}) {
  const { adminFetch } = useAdmin();
  const [text, setText] = useState(initialText);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(car.images.slice(0, MAX_PHOTOS).map((i) => i.id)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const ordered = car.images.filter((i) => selected.has(i.id));
  const max = TEXT_MAX[network];
  const tooLong = text.length > max;
  const full = selected.size >= MAX_PHOTOS;

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PHOTOS) next.add(id);
      return next;
    });
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const post = await adminFetch<SocialPost>(`/api/admin/cars/${car.id}/social-posts`, {
        method: "POST",
        body: JSON.stringify({ network, text, imageIds: ordered.map((i) => i.id) }),
      });
      onPublished(post);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
      setBusy(false);
    }
  }

  // rendered into <body>, so no sticky or blurred parent of the editor can paint over it
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Публикуване в {networkLabels[network]}</h2>
            <p className="text-sm text-muted">{car.specs.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost px-3! py-1.5! text-xs!">
            Затвори
          </button>
        </div>

        {earlier && (
          <p className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">
            Колата вече е публикувана в {networkLabels[network]} на {formatDate(earlier.createdAt)}.
          </p>
        )}

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-sm font-bold" htmlFor="publish-text">
                Текст
              </label>
              {text !== initialText && (
                <button type="button" onClick={() => setText(initialText)} className="btn-ghost px-2! py-0.5! text-xs!">
                  От шаблона
                </button>
              )}
            </div>
            <textarea
              id="publish-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={18}
              className="field font-mono text-xs! leading-relaxed"
            />
            <p className={`mt-1 text-xs ${tooLong ? "font-semibold text-warn" : "text-muted"}`}>
              {text.length} / {max} знака{tooLong ? " — твърде дълъг" : ""}
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-bold">
                Снимки: {selected.size} от {Math.min(MAX_PHOTOS, car.images.length)}
                <span className="font-normal text-muted"> (макс. {MAX_PHOTOS})</span>
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  className="btn-ghost px-2! py-0.5! text-xs!"
                  onClick={() => setSelected(new Set(car.images.slice(0, MAX_PHOTOS).map((i) => i.id)))}
                >
                  Първите {Math.min(MAX_PHOTOS, car.images.length)}
                </button>
                <button type="button" className="btn-ghost px-2! py-0.5! text-xs!" onClick={() => setSelected(new Set())}>
                  Нито една
                </button>
              </span>
            </div>
            <ul className="grid max-h-[26rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
              {car.images.map((img) => {
                const n = ordered.findIndex((i) => i.id === img.id);
                const on = n >= 0;
                const disabled = !on && full;
                return (
                  <li key={img.id}>
                    <button
                      type="button"
                      onClick={() => toggle(img.id)}
                      disabled={disabled}
                      aria-pressed={on}
                      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-2 ${
                        on ? "ring-accent" : "ring-transparent"
                      } ${disabled ? "opacity-40" : "hover:ring-ink/40"}`}
                    >
                      <CarImage src={img.url} alt="" className={`h-full w-full object-cover ${on ? "" : "opacity-60"}`} />
                      {on && (
                        <span className="absolute top-1 left-1 grid h-6 w-6 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                          {n + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-xs text-muted">
              Клик избира или маха снимка. Изпращат се в реда от галерията
              {network === "VIBER" ? "; във Viber всяка снимка е отделно съобщение, а след тях текстът" : ""}.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-semibold break-words text-warn">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Откажи
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy || selected.size < 1 || tooLong || !text.trim()}
            className="btn-primary"
          >
            {busy ? "Публикуване…" : `Публикувай (${selected.size} ${selected.size === 1 ? "снимка" : "снимки"})`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Viber accepts channel posts only after a callback URL is registered, and checks it right away: the site must be
 * reachable over HTTPS (locally through a temporary tunnel such as cloudflared). Needed once per channel.
 */
function ViberConnect({ onMessage }: { onMessage: (m: Message) => void }) {
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

/** The car's first photos as files, in gallery order (for sharing and downloading). */
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
