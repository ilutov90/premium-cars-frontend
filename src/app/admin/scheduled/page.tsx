"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-context";
import { formatDate, scheduledStatusLabels } from "@/lib/format";
import { networkLabels } from "@/lib/post-template";
import type { ScheduledPost, ScheduledPostStatus } from "@/lib/types";

const badge: Record<ScheduledPostStatus, string> = {
  SCHEDULED: "bg-ink/5 text-ink",
  PUBLISHING: "bg-accent/10 text-accent-dark",
  PUBLISHED: "bg-ok/10 text-ok",
  FAILED: "bg-warn/10 text-warn",
  CANCELLED: "bg-ink/5 text-muted",
};

/** Posts planned for later (all cars): the waiting ones first, then those of the last 7 days. */
export default function AdminScheduledPage() {
  const { adminFetch } = useAdmin();
  const [posts, setPosts] = useState<ScheduledPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(() => {
    adminFetch<ScheduledPost[]>("/api/admin/scheduled-posts")
      .then(setPosts)
      .catch((e: Error) => setError(e.message));
  }, [adminFetch]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000); // statuses change when the backend publishes
    return () => clearInterval(timer);
  }, [load]);

  async function cancel(post: ScheduledPost) {
    if (!confirm(`Да отменя ли публикацията в ${networkLabels[post.network]} за ${formatDate(post.publishAt)}?`)) return;
    try {
      await adminFetch(`/api/admin/scheduled-posts/${post.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка");
    }
  }

  const waiting = posts?.filter((p) => p.status === "SCHEDULED" || p.status === "PUBLISHING") ?? [];
  const recent = posts?.filter((p) => p.status !== "SCHEDULED" && p.status !== "PUBLISHING") ?? [];

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-extrabold">Насрочени публикации</h1>
      <p className="mt-1 text-sm text-muted">
        Насрочвате от колата → „Публикувай в …“ → „Насрочи за“. Сървърът проверява на всеки 30 секунди и публикува
        навреме. Неуспешна публикация не се повтаря сама (за да няма двойни постове): публикувайте я отново от колата.
      </p>
      {error && <p className="mt-4 text-sm font-semibold text-warn">{error}</p>}
      {!posts && !error && <p className="mt-6 text-sm text-muted">Зареждане…</p>}

      {posts && (
        <>
          <Section title={`Предстоящи (${waiting.length})`} empty="Няма насрочени публикации.">
            {waiting.map((p) => (
              <Row key={p.id} post={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onCancel={cancel} />
            ))}
          </Section>
          <Section title="Последните 7 дни" empty="Нищо за последните 7 дни.">
            {recent.map((p) => (
              <Row key={p.id} post={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} onCancel={cancel} />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-bold">{title}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card">{children}</ul>
      )}
    </section>
  );
}

function Row({
  post,
  open,
  onToggle,
  onCancel,
}: {
  post: ScheduledPost;
  open: boolean;
  onToggle: () => void;
  onCancel: (p: ScheduledPost) => void;
}) {
  return (
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">
            <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${badge[post.status]}`}>
              {scheduledStatusLabels[post.status]}
            </span>
            <strong>{formatDate(post.publishAt)}</strong> · {networkLabels[post.network]}
          </p>
          <p className="mt-1 truncate text-sm">
            <Link href={`/admin/cars/${post.carId}`} className="font-semibold hover:underline">
              {post.carTitle}
            </Link>
            <span className="text-muted">
              {" "}
              · {post.imageIds.length || "първите"} снимки{post.createdBy ? ` · ${post.createdBy}` : ""}
            </span>
          </p>
          {post.error && <p className="mt-1 text-xs break-words text-warn">{post.error}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onToggle} className="btn-ghost px-3! py-1.5! text-xs!">
            {open ? "Скрий текста" : "Текст"}
          </button>
          {post.status === "SCHEDULED" && (
            <button type="button" onClick={() => onCancel(post)} className="btn-ghost px-3! py-1.5! text-xs! text-warn!">
              Отмени
            </button>
          )}
        </div>
      </div>
      {open && (
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-paper p-3 text-xs whitespace-pre-wrap">{post.body}</pre>
      )}
    </li>
  );
}
