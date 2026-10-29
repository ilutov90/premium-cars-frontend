"use client";

import { useState } from "react";
import {
  categoryLabel,
  checkLabel,
  gradeDetails,
  gradeMeaning,
  itemLabel,
  sortedCategories,
  translateNote,
  verdictLabel,
} from "@/lib/inspection";
import type { Inspection } from "@/lib/types";

/** The source's inspection report on the car page: grade, checks, areas, and every remark with its video. */
export function InspectionReport({ inspection }: { inspection: Inspection }) {
  const remarks = inspection.findings.length;
  const videos = inspection.findings.some((f) => f.videoUrl);
  const abnormal = inspection.categories.reduce((n, c) => n + c.abnormal, 0);
  const details = inspection.grade ? gradeDetails[inspection.grade.toUpperCase()] : undefined;
  return (
    <section>
      <h2 className="text-lg font-extrabold">Техническа проверка</h2>
      <p className="mt-1 text-sm text-muted">
        Колата е проверена от инспектор на продавача. Ето какво е установено{videos ? ", с видео на забележките" : ""}.
      </p>

      <div className="mt-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {inspection.grade && (
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-xl font-extrabold text-paper">
                {inspection.grade}
              </span>
              <span className="text-sm">
                <span className="block font-bold">Оценка {inspection.grade}</span>
                {gradeMeaning[inspection.grade] && (
                  <span className="text-muted">{gradeMeaning[inspection.grade]}</span>
                )}
              </span>
            </div>
          )}
          {inspection.checks.length > 0 && (
            <ul className="flex flex-wrap gap-2 text-sm">
              {inspection.checks.map((c) => (
                <li
                  key={c.title}
                  className={`rounded-full px-3 py-1 font-semibold ${c.passed ? "bg-ok/10 text-ok" : "bg-warn/15 text-warn"}`}
                >
                  {c.passed ? "✓" : "!"} {checkLabel(c.title, c.passed)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {details && (
          <div className="mt-5 rounded-xl bg-paper p-3 text-sm sm:p-4">
            <p className="font-semibold">Какво означава оценка {inspection.grade}</p>
            <dl className="mt-2 space-y-1.5">
              {details.map(([area, text]) => (
                <div key={area} className="sm:flex sm:gap-3">
                  <dt className="shrink-0 font-semibold sm:w-28">{area}</dt>
                  <dd className="text-ink-soft">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {inspection.categories.length > 0 && (
          <dl className="mt-5 grid gap-x-6 text-sm sm:grid-cols-2">
            {sortedCategories(inspection).map((c) => (
              <div key={c.name} className="flex items-baseline justify-between gap-4 border-t border-line py-2">
                <dt className="text-muted">{categoryLabel(c.name)}</dt>
                <dd className="text-right font-semibold">
                  {c.abnormal > 0 ? (
                    <span className="text-warn">
                      {c.abnormal} {c.abnormal === 1 ? "забележка" : "забележки"}
                    </span>
                  ) : (
                    <span className="text-ok">без забележки</span>
                  )}
                  <span className="ml-1 font-normal text-muted">/ {c.normal + c.abnormal} точки</span>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {remarks > 0 ? (
          <div className="mt-5">
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">Забележки</h3>
            <ul className="mt-2 space-y-3">
              {inspection.findings.map((f, i) => (
                <Finding key={`${f.item}-${i}`} finding={f} />
              ))}
            </ul>
          </div>
        ) : abnormal === 0 ? (
          <p className="mt-5 text-sm font-semibold text-ok">Инспекторът не е открил забележки.</p>
        ) : (
          <p className="mt-5 rounded-xl bg-warn/10 p-3 text-sm">
            Продавачът е публикувал само броя на забележките по зони, без описание.{" "}
            <strong>Подробното описание на забележките е налично при запитване.</strong>
          </p>
        )}
      </div>
    </section>
  );
}

function Finding({ finding }: { finding: Inspection["findings"][number] }) {
  const [video, setVideo] = useState<"closed" | "open" | "failed">("closed");
  const sentences = translateNote(finding.note);
  return (
    <li className="rounded-xl bg-paper p-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {itemLabel(finding.item) || categoryLabel(finding.category)}
          {finding.item && finding.category && (
            <span className="font-normal text-muted"> · {categoryLabel(finding.category)}</span>
          )}
        </span>
        {finding.result && (
          <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-bold text-warn">
            {verdictLabel(finding.result)}
          </span>
        )}
      </div>
      {sentences.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {sentences.map((s, i) => (
            <li key={i} lang={s.translated ? "bg" : "en"} className={s.translated ? "" : "text-muted"}>
              {s.text}
            </li>
          ))}
        </ul>
      )}
      {finding.videoUrl && video === "closed" && (
        <button
          type="button"
          onClick={() => setVideo("open")}
          className="mt-2 text-sm font-semibold text-accent hover:underline"
        >
          ▶ Виж видеото от проверката
        </button>
      )}
      {finding.videoUrl && video === "open" && (
        <video
          src={finding.videoUrl}
          poster={finding.imageUrl ?? undefined}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          onError={() => setVideo("failed")}
          className="mt-3 aspect-video w-full max-w-xl rounded-lg bg-ink"
        />
      )}
      {finding.videoUrl && video !== "closed" && (
        <p className="mt-1.5 text-xs text-muted">
          {video === "failed" ? "Видеото не се зареди тук. " : "Не тръгва? "}
          {/* opened directly, without our address as referrer */}
          <a href={finding.videoUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
            Отвори видеото в нов прозорец
          </a>
        </p>
      )}
    </li>
  );
}
