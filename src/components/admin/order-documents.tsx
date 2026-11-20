"use client";

import { useRef, useState } from "react";
import { useAdmin } from "./admin-context";
import { DocumentScanner } from "./document-scanner";
import { formatBytes, formatDate, orderDocumentKinds } from "@/lib/format";
import type { AdminOrder, OrderDocument, OrderDocumentKind } from "@/lib/types";

const fileUrl = (orderId: number, docId: number, download = false) =>
  `/api/admin/orders/${orderId}/documents/${docId}/file${download ? "?download=1" : ""}`;

/** One block per document kind: the files, upload, scan with the camera. */
export function OrderDocuments({
  orderId,
  documents,
  onChange,
}: {
  orderId: number;
  documents: OrderDocument[];
  onChange: (docs: OrderDocument[]) => void;
}) {
  const { adminFetch } = useAdmin();
  const [busyKind, setBusyKind] = useState<OrderDocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<OrderDocumentKind | null>(null);
  const [otherTitle, setOtherTitle] = useState("");

  async function reload() {
    const o = await adminFetch<AdminOrder>(`/api/admin/orders/${orderId}`);
    onChange(o.documents);
  }

  async function upload(kind: OrderDocumentKind, files: Blob[], names: string[]) {
    if (files.length === 0) return;
    setError(null);
    setBusyKind(kind);
    try {
      const body = new FormData();
      body.append("kind", kind);
      if (kind === "OTHER" && otherTitle.trim()) body.append("title", otherTitle.trim());
      files.forEach((f, i) => body.append("files", f, names[i]));
      await adminFetch<unknown>(`/api/admin/orders/${orderId}/documents`, { method: "POST", body });
      if (kind === "OTHER") setOtherTitle("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusyKind(null);
    }
  }

  async function remove(d: OrderDocument) {
    if (!window.confirm(`Да изтрия ли „${d.title || d.fileName}“?`)) return;
    setError(null);
    try {
      await adminFetch<void>(`/api/admin/orders/${orderId}/documents/${d.id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">Документи</h2>
      {error && <p className="mb-3 text-sm font-medium text-accent-dark">{error}</p>}
      <div className="space-y-4">
        {orderDocumentKinds.map(({ kind, label }) => (
          <KindBlock
            key={kind}
            kind={kind}
            label={label}
            docs={documents.filter((d) => d.kind === kind)}
            orderId={orderId}
            busy={busyKind === kind}
            otherTitle={otherTitle}
            onOtherTitle={setOtherTitle}
            onFiles={(files) => void upload(kind, files, files.map((f) => (f as File).name || "scan.jpg")).catch(() => undefined)}
            onScan={() => setScanning(kind)}
            onRemove={remove}
          />
        ))}
      </div>
      {scanning && (
        <DocumentScanner
          onClose={() => setScanning(null)}
          onDone={async (pages) => {
            await upload(
              scanning,
              pages,
              pages.map((_, i) => `scan-${i + 1}.jpg`),
            );
            setScanning(null);
          }}
        />
      )}
    </section>
  );
}

function KindBlock({
  kind,
  label,
  docs,
  orderId,
  busy,
  otherTitle,
  onOtherTitle,
  onFiles,
  onScan,
  onRemove,
}: {
  kind: OrderDocumentKind;
  label: string;
  docs: OrderDocument[];
  orderId: number;
  busy: boolean;
  otherTitle: string;
  onOtherTitle: (v: string) => void;
  onFiles: (files: File[]) => void;
  onScan: () => void;
  onRemove: (d: OrderDocument) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h3 className="text-sm font-bold">{label}</h3>
      {docs.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Няма файлове.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold">{d.title || d.fileName}</p>
                <p className="text-xs text-muted">
                  {d.fileName} · {formatBytes(d.sizeBytes)} · {formatDate(d.uploadedAt)}
                  {d.uploadedBy ? ` · ${d.uploadedBy}` : ""}
                </p>
              </div>
              <div className="flex gap-3 text-xs font-semibold">
                <a href={fileUrl(orderId, d.id)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Отвори
                </a>
                <a href={fileUrl(orderId, d.id, true)} className="underline underline-offset-2">
                  Изтегли
                </a>
                <button type="button" onClick={() => onRemove(d)} className="text-accent-dark underline underline-offset-2">
                  Изтрий
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {kind === "OTHER" && (
          <input
            value={otherTitle}
            onChange={(e) => onOtherTitle(e.target.value)}
            placeholder="Име на документа"
            aria-label="Име на документа"
            className="field w-56"
          />
        )}
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept="application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            onFiles(files);
          }}
        />
        <button type="button" className="btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
          Качи файл
        </button>
        <button type="button" className="btn-ghost" disabled={busy} onClick={onScan}>
          Сканирай с камерата
        </button>
        {busy && <span className="text-sm text-muted">Качване…</span>}
      </div>
      {kind === "CONTRACT" && (
        <p className="mt-2 text-xs text-muted">
          За най-добро качество: iPhone → Бележки → Сканиране на документи; Android → Google Drive → Сканиране, после „Качи
          файл“.
        </p>
      )}
    </div>
  );
}
