// Service worker: keeps the job the admin panel started, opens mobile.bg and fetches the car's photos from our
// site for the photo step (a page on mobile.bg could not read them: other origin).

const MOBILE_BG = "https://www.mobile.bg/";
const MAX_PHOTOS = 17;

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === "start") {
    start(msg.job, sender).then(reply, (e) => reply({ ok: false, error: String(e?.message ?? e) }));
    return true;
  }
  if (msg?.type === "photos") {
    photos(msg.urls).then(reply, (e) => reply({ ok: false, error: String(e?.message ?? e) }));
    return true;
  }
  return false;
});

/** Only jobs from our admin panel (the bridge runs there only), with photos from the same site. */
async function start(job, sender) {
  const origin = new URL(sender.url).origin;
  if (!job || typeof job.carId !== "number" || typeof job.values !== "object") throw new Error("Невалидни данни");
  const urls = (job.photos ?? []).filter((u) => typeof u === "string" && new URL(u).origin === origin);
  const clean = {
    ...job,
    photos: urls.slice(0, MAX_PHOTOS),
    adminOrigin: origin,
    phase: "open",
    startedAt: Date.now(),
  };
  await chrome.storage.local.set({ job: clean });
  await chrome.tabs.create({ url: MOBILE_BG });
  return { ok: true };
}

/** The photos as data URLs, in order (runtime messages carry JSON only). */
async function photos(urls) {
  const { job } = await chrome.storage.local.get("job");
  if (!job) throw new Error("Няма започнато качване");
  const allowed = new Set(job.photos);
  const out = [];
  for (const [i, url] of (urls ?? []).entries()) {
    if (!allowed.has(url)) continue;
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`Снимка ${i + 1}: HTTP ${res.status}`);
    const blob = await res.blob();
    out.push({ name: `photo-${String(i + 1).padStart(2, "0")}`, type: blob.type, dataUrl: await dataUrl(blob) });
  }
  return { ok: true, files: out };
}

async function dataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(binary)}`;
}
