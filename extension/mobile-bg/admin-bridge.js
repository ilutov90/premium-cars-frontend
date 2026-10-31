// Runs on our admin panel: tells the page the extension is installed and passes messages between the page and the
// extension (start an upload, the sites' lists, listings published on mobile.bg and cars.bg, read the lists again).

const VERSION = chrome.runtime.getManifest().version;
document.documentElement.dataset.pciMobileBg = VERSION;

const toPage = (msg) => window.postMessage({ source: "pci-ext", ...msg }, window.location.origin);

/** mobile.bg's data keeps its first names ("catalog", "reports"): older admin pages read those. */
const KEYS = { catalog: "catalog", carsBgCatalog: "carsBgCatalog", reports: "reports", carsBgReports: "carsBgReports" };

window.addEventListener("message", async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const msg = event.data;
  if (!msg || msg.source !== "pci-page") return;
  try {
    if (msg.type === "hello") {
      toPage({ type: "ready", version: VERSION });
    } else if (msg.type === "start") {
      const r = await chrome.runtime.sendMessage({ type: "start", job: msg.job });
      toPage({ type: "started", site: msg.job?.site ?? "MOBILE_BG", ok: !!r?.ok, error: r?.error });
    } else if (msg.type === "refresh") {
      const r = await chrome.runtime.sendMessage({ type: "refresh", sites: msg.sites });
      toPage({ type: "refreshing", ok: !!r?.ok, sites: r?.sites ?? [], error: r?.error });
    } else if (msg.type === "get-catalog") {
      const got = await chrome.storage.local.get([KEYS.catalog, KEYS.carsBgCatalog]);
      toPage({ type: "catalog", catalog: got.catalog ?? null });
      toPage({ type: "carsBgCatalog", catalog: got.carsBgCatalog ?? null });
    } else if (msg.type === "get-reports") {
      await sendReports(KEYS.reports);
      await sendReports(KEYS.carsBgReports);
    } else if (msg.type === "ack-report" && typeof msg.key === "string") {
      const key = msg.site === "CARS_BG" ? KEYS.carsBgReports : KEYS.reports;
      const reports = (await chrome.storage.local.get(key))[key] ?? {};
      delete reports[msg.key];
      await chrome.storage.local.set({ [key]: reports });
    }
  } catch (e) {
    toPage({ type: "error", error: String(e?.message ?? e) });
  }
});

async function sendReports(key) {
  const reports = (await chrome.storage.local.get(key))[key] ?? {};
  toPage({ type: key, reports });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.reports) sendReports(KEYS.reports);
  if (changes.carsBgReports) sendReports(KEYS.carsBgReports);
  if (changes.catalog) toPage({ type: "catalog", catalog: changes.catalog.newValue ?? null });
  if (changes.carsBgCatalog) toPage({ type: "carsBgCatalog", catalog: changes.carsBgCatalog.newValue ?? null });
});

toPage({ type: "ready", version: VERSION });
