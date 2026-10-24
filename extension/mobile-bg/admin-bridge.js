// Runs on our admin panel: tells the page the extension is installed and passes messages between the page and the
// extension (start an upload, mobile.bg's lists, listings published on mobile.bg).

const VERSION = chrome.runtime.getManifest().version;
document.documentElement.dataset.pciMobileBg = VERSION;

const toPage = (msg) => window.postMessage({ source: "pci-ext", ...msg }, window.location.origin);

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== "pci-page") return;
  try {
    if (msg.type === "hello") {
      toPage({ type: "ready", version: VERSION });
    } else if (msg.type === "start") {
      const r = await chrome.runtime.sendMessage({ type: "start", job: msg.job });
      toPage({ type: "started", ok: !!r?.ok, error: r?.error });
    } else if (msg.type === "get-catalog") {
      const { catalog } = await chrome.storage.local.get("catalog");
      toPage({ type: "catalog", catalog: catalog ?? null });
    } else if (msg.type === "get-reports") {
      await sendReports();
    } else if (msg.type === "ack-report" && typeof msg.key === "string") {
      const { reports = {} } = await chrome.storage.local.get("reports");
      delete reports[msg.key];
      await chrome.storage.local.set({ reports });
    }
  } catch (e) {
    toPage({ type: "error", error: String(e?.message ?? e) });
  }
});

async function sendReports() {
  const { reports = {} } = await chrome.storage.local.get("reports");
  toPage({ type: "reports", reports });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.reports) sendReports();
  if (changes.catalog) toPage({ type: "catalog", catalog: changes.catalog.newValue ?? null });
});

toPage({ type: "ready", version: VERSION });
