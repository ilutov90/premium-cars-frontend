"use client";

import { useState } from "react";
import type { PageResponse } from "@/lib/types";

/** "‹ Предишна · Страница 3 от 1 042 · 49 983 коли · Следваща ›" with first / last and a page number to jump to. */
export function Pager({
  page,
  onPage,
  noun,
  bottom,
}: {
  page: PageResponse<unknown>;
  onPage: (p: number) => void;
  /** what is counted, in the plural: "коли", "пускания" */
  noun: string;
  bottom?: boolean;
}) {
  const [jump, setJump] = useState("");
  const from = page.page * page.size + 1;
  const to = Math.min(from + page.items.length - 1, page.totalItems);
  const last = Math.max(page.totalPages - 1, 0);
  const btn = "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:ring-ink disabled:opacity-40 disabled:hover:ring-line";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 text-sm ${bottom ? "mt-4" : "mb-3"}`}>
      <span className="text-muted">
        {from.toLocaleString("bg-BG")}–{to.toLocaleString("bg-BG")} от {page.totalItems.toLocaleString("bg-BG")} {noun}
      </span>
      {page.totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={btn} disabled={page.page === 0} onClick={() => onPage(0)} aria-label="Първа страница">
            «
          </button>
          <button type="button" className={btn} disabled={page.page === 0} onClick={() => onPage(page.page - 1)}>
            ‹ Предишна
          </button>
          <form
            className="flex items-center gap-1.5 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(jump);
              if (Number.isInteger(n) && n >= 1) onPage(Math.min(n, page.totalPages) - 1);
              setJump("");
            }}
          >
            <span className="text-muted">Страница</span>
            <input
              value={jump}
              onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
              placeholder={String(page.page + 1)}
              inputMode="numeric"
              aria-label="Отиди на страница"
              className="w-14 rounded-lg border border-line bg-card px-2 py-1 text-center text-xs font-semibold"
            />
            <span className="text-muted">от {page.totalPages.toLocaleString("bg-BG")}</span>
          </form>
          <button type="button" className={btn} disabled={page.page >= last} onClick={() => onPage(page.page + 1)}>
            Следваща ›
          </button>
          <button type="button" className={btn} disabled={page.page >= last} onClick={() => onPage(last)} aria-label="Последна страница">
            »
          </button>
        </div>
      )}
    </div>
  );
}
