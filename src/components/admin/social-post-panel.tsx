"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "./admin-context";
import { CarImage } from "@/components/car-image";
import { formatDate, scheduledStatusLabels } from "@/lib/format";
import {
  defaultTemplates,
  networkLabels,
  renderTemplate,
  templatesFrom,
  templateValues,
  type TemplateKind,
} from "@/lib/post-template";
import type {
  AdminCar,
  PostSettings,
  PostTemplate,
  PublishRequest,
  ScheduledPost,
  SocialNetwork,
  SocialPost,
  SocialStatus,
  ViberConnectResponse,
} from "@/lib/types";

/** Text limits of the networks (Facebook allows far more; 5000 keeps posts readable). */
const TEXT_MAX: Record<SocialNetwork, number> = { FACEBOOK: 5000, INSTAGRAM: 2200, VIBER: 7000 };
const MAX_PHOTOS = 10;
const networks: SocialNetwork[] = ["FACEBOOK", "INSTAGRAM", "VIBER"];
const FINISHED: ScheduledPost["status"][] = ["PUBLISHED", "FAILED", "CANCELLED"];

type Message = { ok: boolean; text: string };

/** "Facebook, Instagram и Viber" */
function namesOf(list: SocialNetwork[]): string {
  const names = list.map((n) => networkLabels[n]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} и ${names[names.length - 1]}` : (names[0] ?? "");
}

/** "във Facebook" / "в Instagram" */
const inNetwork = (n: SocialNetwork) => `${n === "INSTAGRAM" ? "в" : "във"} ${networkLabels[n]}`;

/** "във Facebook, Instagram и Viber" */
const inNetworks = (list: SocialNetwork[]) => (list.length ? `${list[0] === "INSTAGRAM" ? "в" : "във"} ${namesOf(list)}` : "");

/**
 * Publishing the car to Facebook, Instagram and Viber with one action (through a confirmation step), sharing and
 * earlier posts.
 */
export function SocialPostPanel({ car }: { car: AdminCar }) {
  const { adminFetch } = useAdmin();
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const [templates, setTemplates] = useState<Record<TemplateKind, string>>(defaultTemplates);
  const [settings, setSettings] = useState<PostSettings | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledPost[]>([]);
  // the posts of the last publication made now: followed until each is PUBLISHED or FAILED
  const [batch, setBatch] = useState<number[]>([]);
  const [dialog, setDialog] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    adminFetch<SocialStatus>("/api/admin/social/status").then(setStatus).catch(() => setStatus(null));
    adminFetch<SocialPost[]>(`/api/admin/cars/${car.id}/social-posts`).then(setPosts).catch(() => setPosts([]));
    adminFetch<ScheduledPost[]>(`/api/admin/cars/${car.id}/scheduled-posts`)
      .then(setScheduled)
      .catch(() => setScheduled([]));
    adminFetch<PostTemplate[]>("/api/admin/post-templates")
      .then((list) => setTemplates(templatesFrom(list)))
      .catch(() => undefined);
    adminFetch<PostSettings>("/api/admin/post-settings").then(setSettings).catch(() => setSettings(null));
  }, [adminFetch, car.id]);

  const origin = typeof window !== "undefined" ? window.location.origin : undefined;
  const textFor = (kind: TemplateKind) => renderTemplate(templates[kind], templateValues(car, origin, settings));
  const noPhotos = car.images.length === 0;
  const configured = networks.filter((n) =>
    n === "FACEBOOK" ? status?.facebook : n === "INSTAGRAM" ? status?.instagram : status?.viber,
  );

  // published posts seen so far, to reload the list of posts when one more is out
  const seenPublished = useRef(new Set<number>());
  const batchPosts = batch.map((id) => scheduled.find((p) => p.id === id)).filter((p): p is ScheduledPost => !!p);
  const waiting = batchPosts.some((p) => !FINISHED.includes(p.status));

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      let list: ScheduledPost[];
      try {
        list = await adminFetch<ScheduledPost[]>(`/api/admin/cars/${car.id}/scheduled-posts`);
      } catch {
        return; // try again on the next tick
      }
      setScheduled(list);
      const published = list.filter((p) => p.status === "PUBLISHED").map((p) => p.id);
      if (published.some((id) => !seenPublished.current.has(id))) {
        published.forEach((id) => seenPublished.current.add(id));
        adminFetch<SocialPost[]>(`/api/admin/cars/${car.id}/social-posts`).then(setPosts).catch(() => undefined);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [waiting, adminFetch, car.id]);

  async function cancelScheduled(post: ScheduledPost) {
    if (!confirm(`Да отменя ли насрочената публикация ${inNetwork(post.network)} за ${formatDate(post.publishAt)}?`)) return;
    try {
      await adminFetch(`/api/admin/scheduled-posts/${post.id}`, { method: "DELETE" });
      setScheduled((list) => list.map((p) => (p.id === post.id ? { ...p, status: "CANCELLED" } : p)));
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Грешка" });
    }
  }

  // waiting ones and the failed ones (they need the admin's attention); the current publication is shown above
  const shownScheduled = scheduled.filter(
    (p) => !batch.includes(p.id) && (p.status === "SCHEDULED" || p.status === "PUBLISHING" || p.status === "FAILED"),
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(textFor("FACEBOOK"));
      setMessage({ ok: true, text: "Текстът (шаблон за Facebook и Instagram) е копиран ✓" });
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

      <button
        type="button"
        className="btn-primary w-full px-3! py-2.5! text-sm!"
        disabled={configured.length === 0 || noPhotos || busy !== null}
        onClick={() => {
          setMessage(null);
          setDialog(true);
        }}
      >
        Публикувай {inNetworks(configured)}…
      </button>
      {status && configured.length < networks.length && (
        <p className="mt-2 text-xs text-muted">
          {!status.facebook && "Facebook не е настроен (FB_PAGE_ID, FB_ACCESS_TOKEN). "}
          {!status.instagram && "Instagram не е настроен (IG_USER_ID, FB_ACCESS_TOKEN, IMGBB_API_KEY). "}
          {!status.viber && "Viber не е настроен (VIBER_CHANNEL_TOKEN, IMGBB_API_KEY). "}
          Виж README на бекенда.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">
        Едно публикуване за всички мрежи: преди това се показват текстовете (общ за Facebook и Instagram и отделен за
        Viber, може да се променят) и снимките за избор. Може веднага или насрочено за ден и час.
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

      {batchPosts.length > 0 && (
        <p className={`mt-3 text-sm font-semibold ${batchPosts.some((p) => p.status === "FAILED") ? "text-warn" : "text-ok"}`}>
          {waiting
            ? `Публикува се ${inNetworks(batchPosts.map((p) => p.network))}… Може да продължите работа, резултатът ще се покаже тук.`
            : batchPosts.every((p) => p.status === "PUBLISHED")
              ? "Публикувано навсякъде ✓"
              : "Публикуването приключи, но не навсякъде:"}
        </p>
      )}
      {batchPosts.length > 0 && (
        <ul className="mt-1 space-y-1 text-sm" aria-live="polite">
          {batchPosts.map((p) => (
            <li key={p.id} className="break-words">
              <span className="font-semibold">{networkLabels[p.network]}:</span>{" "}
              {p.status === "PUBLISHED" ? (
                <span className="font-semibold text-ok">публикувано ✓</span>
              ) : p.status === "FAILED" ? (
                <span className="font-semibold text-warn">не успя — {p.error ?? "грешка"}</span>
              ) : p.status === "CANCELLED" ? (
                <span className="text-muted">отменено</span>
              ) : (
                <span className="text-muted">публикува се…</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {!waiting && batchPosts.some((p) => p.status === "FAILED") && (
        <p className="mt-1 text-xs text-muted">
          Проверете дали постът все пак не е излязъл. Ако не е, натиснете „Публикувай…“ отново: отметнати ще са само
          мрежите, в които колата още не е публикувана.
        </p>
      )}

      {shownScheduled.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
          {shownScheduled.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className={p.status === "FAILED" ? "font-semibold text-warn" : "font-semibold"}>
                  {scheduledStatusLabels[p.status]}
                </span>{" "}
                · {networkLabels[p.network]} · {formatDate(p.publishAt)}
                {p.error && <span className="block break-words text-warn">{p.error}</span>}
              </span>
              {p.status === "SCHEDULED" && (
                <button type="button" onClick={() => cancelScheduled(p)} className="shrink-0 font-semibold text-warn hover:underline">
                  отмени
                </button>
              )}
            </li>
          ))}
        </ul>
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
          configured={configured}
          initialTexts={{ FACEBOOK: textFor("FACEBOOK"), VIBER: textFor("VIBER") }}
          earlier={posts}
          onClose={() => setDialog(false)}
          onPublishing={(list) => {
            setScheduled((before) => [...list, ...before]);
            setBatch(list.map((p) => p.id));
            setDialog(false);
            setMessage(null);
          }}
          onScheduled={(list) => {
            setScheduled((before) => [...list, ...before]);
            setBatch([]);
            setDialog(false);
            setMessage({
              ok: true,
              text: `Насрочено за ${formatDate(list[0].publishAt)}: ${namesOf(list.map((p) => p.network))} ✓`,
            });
          }}
        />
      )}
    </section>
  );
}

/** The networks ticked when the dialog opens: the configured ones the car is not posted to yet (or all of them). */
function initialNetworks(configured: SocialNetwork[], earlier: SocialPost[]): SocialNetwork[] {
  const fresh = configured.filter((n) => !earlier.some((p) => p.network === n));
  return fresh.length > 0 ? fresh : configured;
}

/**
 * The confirmation step for all networks at once: which networks, the Facebook/Instagram text and the Viber text
 * (from the templates, editable), the photos to send (1 to 10, gallery order, the same everywhere), now or later.
 */
function PublishDialog({
  car,
  configured,
  initialTexts,
  earlier,
  onClose,
  onPublishing,
  onScheduled,
}: {
  car: AdminCar;
  configured: SocialNetwork[];
  initialTexts: Record<"FACEBOOK" | "VIBER", string>;
  earlier: SocialPost[];
  onClose: () => void;
  onPublishing: (posts: ScheduledPost[]) => void;
  onScheduled: (posts: ScheduledPost[]) => void;
}) {
  const { adminFetch } = useAdmin();
  const [chosen, setChosen] = useState<Set<SocialNetwork>>(() => new Set(initialNetworks(configured, earlier)));
  const [texts, setTexts] = useState(initialTexts);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(car.images.slice(0, MAX_PHOTOS).map((i) => i.id)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [publishAt, setPublishAt] = useState(defaultScheduleTime);
  // when the dialog opened (render must stay pure); the backend checks the time again when scheduling
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const picked = networks.filter((n) => chosen.has(n));
  const meta = chosen.has("FACEBOOK") || chosen.has("INSTAGRAM");
  const viber = chosen.has("VIBER");
  const metaMax = chosen.has("INSTAGRAM") ? TEXT_MAX.INSTAGRAM : TEXT_MAX.FACEBOOK;
  const metaInvalid = meta && (!texts.FACEBOOK.trim() || texts.FACEBOOK.length > metaMax);
  const viberInvalid = viber && (!texts.VIBER.trim() || texts.VIBER.length > TEXT_MAX.VIBER);
  const postedBefore = earlier.filter((p, i) => chosen.has(p.network) && earlier.findIndex((q) => q.network === p.network) === i);

  const ordered = car.images.filter((i) => selected.has(i.id));
  const full = selected.size >= MAX_PHOTOS;

  function toggleNetwork(n: SocialNetwork) {
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  function toggle(id: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_PHOTOS) next.add(id);
      return next;
    });
  }

  const scheduleDate = when === "later" && publishAt ? new Date(publishAt) : null;
  const scheduleInvalid =
    when === "later" && (!scheduleDate || Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() < openedAt + 60_000);

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const body: PublishRequest = {
        posts: picked.map((network) => ({ network, text: network === "VIBER" ? texts.VIBER : texts.FACEBOOK })),
        imageIds: ordered.map((i) => i.id),
      };
      if (when === "later" && scheduleDate) body.publishAt = scheduleDate.toISOString();
      // answered at once: the server publishes in the background (or at the chosen time)
      const posts = await adminFetch<ScheduledPost[]>(`/api/admin/cars/${car.id}/publications`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (body.publishAt) onScheduled(posts);
      else onPublishing(posts);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Грешка";
      setError(message.startsWith("Pick a time") ? "Изберете час поне минута напред (или публикувайте веднага)." : message);
      setBusy(false);
    }
  }

  const photoWord = selected.size === 1 ? "снимка" : "снимки";

  // rendered into <body>, so no sticky or blurred parent of the editor can paint over it
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-5xl rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold">Публикуване в социалните мрежи</h2>
            <p className="text-sm text-muted">{car.specs.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost px-3! py-1.5! text-xs!">
            Затвори
          </button>
        </div>

        <fieldset className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-line p-3 text-sm">
          <legend className="px-1 font-bold">Къде</legend>
          {networks.map((n) => {
            const ok = configured.includes(n);
            return (
              <label key={n} className={`flex items-center gap-2 ${ok ? "" : "text-muted"}`}>
                <input
                  type="checkbox"
                  checked={chosen.has(n)}
                  disabled={!ok}
                  onChange={() => toggleNetwork(n)}
                  className="h-4 w-4 accent-accent"
                />
                {networkLabels[n]}
                {!ok && " (не е настроен)"}
              </label>
            );
          })}
        </fieldset>

        {postedBefore.length > 0 && (
          <p className="mt-3 rounded-xl bg-warn/10 p-3 text-sm text-warn">
            Колата вече е публикувана{" "}
            {postedBefore.map((p, i) => (
              <span key={p.id}>
                {i > 0 && (i === postedBefore.length - 1 ? " и " : ", ")}
                {inNetwork(p.network)} на {formatDate(p.createdAt)}
              </span>
            ))}
            . Махнете отметката, ако не искате втори пост там.
          </p>
        )}

        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {meta && (
              <PostText
                id="text-meta"
                label={`Текст за ${namesOf(picked.filter((n) => n !== "VIBER"))}`}
                value={texts.FACEBOOK}
                initial={initialTexts.FACEBOOK}
                max={metaMax}
                maxNote={chosen.has("INSTAGRAM") ? "лимитът на Instagram" : undefined}
                rows={viber ? 12 : 20}
                onChange={(v) => setTexts((t) => ({ ...t, FACEBOOK: v }))}
              />
            )}
            {viber && (
              <PostText
                id="text-viber"
                label="Текст за Viber"
                value={texts.VIBER}
                initial={initialTexts.VIBER}
                max={TEXT_MAX.VIBER}
                rows={meta ? 9 : 20}
                onChange={(v) => setTexts((t) => ({ ...t, VIBER: v }))}
              />
            )}
            {!meta && !viber && <p className="text-sm text-muted">Изберете поне една мрежа.</p>}
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
            <ul className="grid max-h-[30rem] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
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
              Клик избира или маха снимка. Едни и същи снимки отиват във всички мрежи, в реда от галерията
              {viber ? "; във Viber всяка снимка е отделно съобщение, а след тях текстът" : ""}.
            </p>
          </div>
        </div>

        <fieldset className="mt-5 rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-bold">Кога</legend>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} className="accent-accent" />
              Веднага
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} className="accent-accent" />
              Насрочи за
            </label>
            <input
              type="datetime-local"
              value={publishAt}
              min={toLocalInput(new Date(openedAt + 2 * 60_000))}
              onChange={(e) => {
                setPublishAt(e.target.value);
                setWhen("later");
              }}
              className="field w-auto! py-1.5!"
              aria-label="Дата и час на публикуване"
            />
          </div>
          {when === "later" && (
            <p className={`mt-2 text-xs ${scheduleInvalid ? "font-semibold text-warn" : "text-muted"}`}>
              {scheduleInvalid
                ? "Изберете дата и час поне минута напред."
                : `Ще се публикува ${picked.length > 1 ? "едновременно " : ""}на ${formatDate(scheduleDate!.toISOString())} (по часа на този компютър) с текстовете и снимките, избрани сега. Отменя се от „Насрочени“.`}
            </p>
          )}
        </fieldset>

        {error && <p className="mt-3 text-sm font-semibold break-words text-warn">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {picked.length > 0 && <span className="mr-auto text-sm text-muted">{namesOf(picked)}</span>}
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Откажи
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy || picked.length === 0 || selected.size < 1 || metaInvalid || viberInvalid || scheduleInvalid}
            className="btn-primary"
          >
            {busy
              ? when === "later"
                ? "Насрочване…"
                : "Изпращане…"
              : `${when === "later" ? "Насрочи" : "Публикувай"} (${selected.size} ${photoWord})`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** One editable post text with its length and limit. */
function PostText({
  id,
  label,
  value,
  initial,
  max,
  maxNote,
  rows,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  initial: string;
  max: number;
  maxNote?: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  const tooLong = value.length > max;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="text-sm font-bold" htmlFor={id}>
          {label}
        </label>
        {value !== initial && (
          <button type="button" onClick={() => onChange(initial)} className="btn-ghost px-2! py-0.5! text-xs!">
            От шаблона
          </button>
        )}
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="field font-mono text-xs! leading-relaxed"
      />
      <p className={`mt-1 text-xs ${tooLong || !value.trim() ? "font-semibold text-warn" : "text-muted"}`}>
        {value.length} / {max} знака{maxNote ? ` (${maxNote})` : ""}
        {tooLong ? " — твърде дълъг" : !value.trim() ? " — празен" : ""}
      </p>
    </div>
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

/** "2026-10-22T09:00" in the browser's time zone, the format of <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Suggested time: tomorrow at 09:00. */
function defaultScheduleTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return toLocalInput(d);
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
