// Service worker: keeps the jobs the admin panel started (one per site: "job" for mobile.bg, "carsBgJob" for
// cars.bg), opens the site, and fetches the car's photos from our site for the photo step (a page on mobile.bg or
// cars.bg could not read them: other origin). Also opens the sites to read their lists again ("refresh").

const SITES = {
  MOBILE_BG: { url: "https://www.mobile.bg/", jobKey: "job", maxPhotos: 17 },
  CARS_BG: { url: "https://www.cars.bg/publishcar.php?fromothersection=1", jobKey: "carsBgJob", maxPhotos: 15 },
};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  const answer = (p) => {
    p.then(reply, (e) => reply({ ok: false, error: String(e?.message ?? e) }));
    return true;
  };
  if (msg?.type === "start") return answer(start(msg.job, sender));
  if (msg?.type === "photos") return answer(photos(msg.urls, msg.site));
  if (msg?.type === "refresh") return answer(refresh(msg.sites, sender));
  return false;
});

const siteOf = (name) => SITES[name ?? "MOBILE_BG"] ?? null;

/** Only jobs from our admin panel (the bridge runs there only), with photos from the same site. */
async function start(job, sender) {
  const origin = new URL(sender.url).origin;
  if (!job || typeof job.carId !== "number" || typeof job.values !== "object") throw new Error("Невалидни данни");
  const site = siteOf(job.site);
  if (!site) throw new Error("Непознат сайт");
  const urls = (job.photos ?? []).filter((u) => typeof u === "string" && new URL(u).origin === origin);
  const clean = {
    ...job,
    photos: urls.slice(0, site.maxPhotos),
    adminOrigin: origin,
    phase: "open",
    startedAt: Date.now(),
  };
  await chrome.storage.local.set({ [site.jobKey]: clean });
  await chrome.tabs.create({ url: site.url });
  return { ok: true };
}

/** Opens the sites so their content scripts read the makes and models again. */
async function refresh(sites, sender) {
  if (!sender.url) throw new Error("Невалидна заявка");
  const wanted = (Array.isArray(sites) ? sites : []).filter((s) => SITES[s]);
  const { refresh: current = {} } = await chrome.storage.local.get("refresh");
  for (const s of wanted) current[s] = Date.now();
  await chrome.storage.local.set({ refresh: current });
  for (const s of wanted) await chrome.tabs.create({ url: SITES[s].url, active: false });
  return { ok: true, sites: wanted };
}

/** The photos as data URLs, in order (runtime messages carry JSON only). */
async function photos(urls, siteName) {
  const site = siteOf(siteName);
  if (!site) throw new Error("Непознат сайт");
  const job = (await chrome.storage.local.get(site.jobKey))[site.jobKey];
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
