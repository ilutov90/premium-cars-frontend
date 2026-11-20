"use client";
/* eslint-disable @next/next/no-img-element -- page previews are local blob URLs */

import { useEffect, useRef, useState } from "react";

interface Page {
  id: number;
  blob: Blob;
  url: string;
}

const MAX_SIDE = 2000;

/** Full-screen camera scanner: takes pages (optionally black-and-white, higher contrast) and hands them back as JPEGs. */
export function DocumentScanner({ onClose, onDone }: { onClose: () => void; onDone: (pages: Blob[]) => Promise<void> }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fallback = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const pagesRef = useRef<Page[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [live, setLive] = useState(false);
  // the scanner is only mounted on a click, so navigator exists
  const [problem, setProblem] = useState<string | null>(() =>
    typeof navigator.mediaDevices?.getUserMedia === "function" ? null : "Камерата не е достъпна в този браузър.",
  );
  const [documentMode, setDocumentMode] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator.mediaDevices?.getUserMedia !== "function") return;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => undefined);
        }
        setLive(true);
      })
      .catch(() => setProblem("Няма достъп до камерата (разрешението е отказано)."));
    return () => {
      cancelled = true;
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
      pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  /** Draws a frame / image scaled to at most MAX_SIDE; document mode = grayscale + contrast. */
  async function toJpeg(source: CanvasImageSource, w: number, h: number): Promise<Blob> {
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    // done on the pixels: canvas filters are missing in older Safari (iPhone)
    if (documentMode) toDocument(ctx, canvas.width, canvas.height);
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Снимката не може да се обработи"))), "image/jpeg", 0.85),
    );
  }

  function add(blob: Blob) {
    setPages((p) => [...p, { id: nextId.current++, blob, url: URL.createObjectURL(blob) }]);
  }

  async function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    try {
      add(await toJpeg(v, v.videoWidth, v.videoHeight));
    } catch (e) {
      setProblem((e as Error).message);
    }
  }

  async function fromFiles(files: File[]) {
    for (const f of files) {
      try {
        const bitmap = await createImageBitmap(f, { imageOrientation: "from-image" });
        add(await toJpeg(bitmap, bitmap.width, bitmap.height));
        bitmap.close();
      } catch {
        setProblem("Снимката не може да се прочете.");
      }
    }
  }

  function remove(id: number) {
    setPages((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return list.filter((p) => p.id !== id);
    });
  }

  function move(index: number, by: -1 | 1) {
    setPages((list) => {
      const to = index + by;
      if (to < 0 || to >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[to]] = [copy[to], copy[index]];
      return copy;
    });
  }

  async function finish() {
    setSending(true);
    setProblem(null);
    try {
      await onDone(pages.map((p) => p.blob));
    } catch {
      // the upload's error is shown by the documents section; keep the pages so nothing is lost
      setProblem("Качването не успя. Страниците са запазени, опитайте пак.");
      setSending(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Сканиране на документ" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-3 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={documentMode} onChange={(e) => setDocumentMode(e.target.checked)} />
          Документ (черно-бяло, по-контрастно)
        </label>
        <button type="button" onClick={onClose} disabled={sending} className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
          Затвори
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <video ref={video} playsInline muted className={`h-full w-full object-contain ${live ? "" : "hidden"}`} />
        {!live && (
          <div className="grid h-full place-items-center p-6 text-center text-sm">
            {problem ?? "Стартиране на камерата…"}
          </div>
        )}
      </div>

      {problem && live && <p className="px-3 py-1 text-center text-sm text-red-300">{problem}</p>}

      {pages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {pages.map((p, i) => (
            <div key={p.id} className="shrink-0 text-center text-xs">
              <img src={p.url} alt={`Страница ${i + 1}`} className="h-20 w-14 rounded object-cover" />
              <div className="mt-1 flex justify-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Нагоре" className="px-1.5 disabled:opacity-30">
                  ←
                </button>
                <button type="button" onClick={() => remove(p.id)} aria-label="Махни страницата" className="px-1.5 text-red-300">
                  ✕
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === pages.length - 1} aria-label="Надолу" className="px-1.5 disabled:opacity-30">
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 p-4">
        <input
          ref={fallback}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void fromFiles(files);
          }}
        />
        {live ? (
          <button type="button" onClick={() => void capture()} disabled={sending} className="rounded-full bg-white px-8 py-4 text-base font-bold text-black">
            Снимай страница
          </button>
        ) : (
          <button type="button" onClick={() => fallback.current?.click()} className="rounded-full bg-white px-8 py-4 text-base font-bold text-black">
            Снимай с телефона
          </button>
        )}
        <button type="button" onClick={() => void finish()} disabled={pages.length === 0 || sending} className="rounded-full bg-emerald-500 px-8 py-4 text-base font-bold text-black disabled:opacity-40">
          {sending ? "Качване…" : `Готово (${pages.length} стр.)`}
        </button>
      </div>
    </div>
  );
}

/** Grayscale with more contrast and a little more light, so a paper page reads like a scan. */
function toDocument(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const contrast = 1.6;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + 12));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}
