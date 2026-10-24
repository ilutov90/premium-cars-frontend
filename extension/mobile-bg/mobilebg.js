// Runs on mobile.bg (isolated world): follows the job the admin panel started through the 3 steps of
// "Добави обява" and shows what it did in a small panel. It fills in and uploads, but never presses
// "ПРОДЪЛЖИ": for a dealer the "ПРОДЪЛЖИ" of step 2 publishes the listing, so the admin presses it.
(() => {
  let seq = 0;
  const pending = new Map();
  /** A request to the page script; null when it does not answer in time. */
  const call = (type, data = {}, timeout = 120000) =>
    new Promise((resolve) => {
      const id = `pci-${Date.now()}-${++seq}`;
      const timer = setTimeout(() => pending.delete(id) && resolve(null), timeout);
      pending.set(id, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
      window.postMessage({ source: "pci-iso", id, type, ...data }, window.location.origin);
    });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let unloading = false;
  window.addEventListener("beforeunload", () => (unloading = true));

  /** The page script loads next to this one: wait until it answers. */
  async function pageScriptReady() {
    for (let i = 0; i < 25; i++) {
      if ((await call("photoCount", {}, 200)) !== null) return true;
    }
    return false;
  }
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "pci-main") return;
    if (event.data.progress) {
      status(`Качване на снимки: ${event.data.progress} от ${event.data.total}…`);
      return;
    }
    const resolve = pending.get(event.data.id);
    if (resolve) {
      pending.delete(event.data.id);
      resolve(event.data.result);
    }
  });

  const get = async (key) => (await chrome.storage.local.get(key))[key];
  const setJob = (job) => chrome.storage.local.set({ job });
  const clearJob = () => chrome.storage.local.remove("job");

  // ------------------------------------------------------------------ panel

  let box;
  function panel() {
    if (box) return box;
    box = document.createElement("div");
    box.style.cssText =
      "position:fixed;right:16px;bottom:16px;z-index:2147483647;width:360px;max-height:70vh;overflow:auto;" +
      "background:#15151a;color:#f6f4ef;font:13px/1.45 system-ui,sans-serif;border-radius:14px;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.35);padding:14px 16px";
    document.body.appendChild(box);
    return box;
  }
  function render({ title, text, done = [], missing = [], warn = false, cancel = true }) {
    const b = panel();
    b.replaceChildren();
    const h = document.createElement("div");
    h.style.cssText = "font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;gap:8px";
    h.textContent = "Premium Cars → mobile.bg";
    const x = document.createElement("button");
    x.textContent = "✕";
    x.title = "Скрий";
    x.style.cssText = "background:none;border:0;color:#f6f4ef99;cursor:pointer;font-size:14px";
    x.onclick = () => b.remove() || (box = null);
    h.appendChild(x);
    b.appendChild(h);
    const t = document.createElement("div");
    t.style.cssText = `font-weight:600;margin-bottom:4px;color:${warn ? "#ffb59a" : "#9be3b4"}`;
    t.textContent = title;
    b.appendChild(t);
    const p = document.createElement("div");
    p.id = "pci-status";
    p.style.whiteSpace = "pre-line";
    p.textContent = text ?? "";
    b.appendChild(p);
    const list = (label, items, color) => {
      if (!items.length) return;
      const d = document.createElement("details");
      d.open = color === "#ffb59a";
      d.style.marginTop = "8px";
      const s = document.createElement("summary");
      s.textContent = `${label} (${items.length})`;
      s.style.cssText = `cursor:pointer;color:${color}`;
      d.appendChild(s);
      const ul = document.createElement("ul");
      ul.style.cssText = "margin:4px 0 0 16px;padding:0";
      for (const i of items) {
        const li = document.createElement("li");
        li.textContent = i;
        ul.appendChild(li);
      }
      d.appendChild(ul);
      b.appendChild(d);
    };
    list("Не са намерени — попълнете ги ръчно", missing, "#ffb59a");
    list("Попълнено", done, "#f6f4efaa");
    if (cancel) {
      const c = document.createElement("button");
      c.textContent = "Спри качването от админ панела";
      c.style.cssText =
        "margin-top:10px;background:none;border:1px solid #f6f4ef44;color:#f6f4ef;border-radius:999px;" +
        "padding:4px 10px;cursor:pointer;font-size:12px";
      c.onclick = async () => {
        await clearJob();
        render({ title: "Спряно", text: "Разширението няма да попълва повече тази обява.", cancel: false });
      };
      b.appendChild(c);
    }
  }
  const status = (text) => {
    const el = document.getElementById("pci-status");
    if (el) el.textContent = text;
  };

  // ------------------------------------------------------------------ pages

  const pageText = () => document.body?.innerText ?? "";
  const isStep1 = () => !!document.forms.pub?.f5;
  const isStep2 = () => !!document.querySelector("#imgUpload");
  const isStep3 = () => /Ако не желаете да промотирате/i.test(pageText()) && !isStep1() && !isStep2();

  async function captureCatalog() {
    const catalog = await call("capture");
    if (catalog && catalog.brands?.length) await chrome.storage.local.set({ catalog });
  }

  async function run() {
    if (!(await pageScriptReady())) return;
    if (isStep1()) await captureCatalog(); // mobile.bg's lists for the admin panel, on every visit of the form
    const job = await get("job");
    if (!job) return;
    // a job left over for a day is not continued
    if (Date.now() - (job.startedAt ?? 0) > 24 * 3600 * 1000) {
      await clearJob();
      return;
    }

    if (isStep1()) return step1(job);
    if (isStep2()) return step2(job);
    if (isStep3()) return step3(job);

    if (job.phase === "open") {
      const add = [...document.querySelectorAll("a")].find((a) => /ДОБАВИ ОБЯВА/i.test(a.textContent ?? ""));
      if (add?.href) {
        window.location.href = add.href;
        return;
      }
    }
    render({
      title: `Качване на ${job.title ?? "кола"}`,
      text: "Отворете „ДОБАВИ ОБЯВА“ (категория „Автомобили и Джипове“). Ако не сте влезли в профила, влезте първо.",
    });
  }

  async function step1(job) {
    const v = job.values;
    const region = document.forms.pub.f18;
    const wantsRegion = v.region && region && !optionMatches(region, v.region);
    if (wantsRegion && job.phase !== "region") {
      // mobile.bg reloads the form when the region changes: set it first, continue after the reload
      await setJob({ ...job, phase: "region" });
      render({ title: "Стъпка 1", text: "Избирам „Намира се в“… (mobile.bg презарежда формата)" });
      const r = await call("region", { region: v.region });
      if (r?.ok) {
        await sleep(4000);
        if (unloading) return; // continues after the reload
      }
    }
    const r = await call("fill", { values: v, extras: job.extras });
    await setJob({ ...job, phase: "step1" });
    if (r?.error) {
      render({ title: "Стъпка 1", text: r.error, warn: true });
      return;
    }
    render({
      title: "Стъпка 1 е попълнена",
      text:
        "Проверете полетата, коригирайте ако трябва и натиснете „ПРОДЪЛЖИ“ най-долу. " +
        "На следващата стъпка ще кача снимките.",
      done: r.done ?? [],
      missing: r.missing ?? [],
      warn: (r.missing ?? []).length > 0,
    });
  }

  function optionMatches(select, wanted) {
    const opt = select.options[select.selectedIndex];
    if (!opt || opt.value === "") return false;
    const n = (s) => String(s).toLowerCase().replace(/^(обл\.|гр\.)\s*/, "").trim();
    return opt.value === wanted || n(opt.text) === n(wanted) || n(opt.value) === n(wanted);
  }

  async function step2(job) {
    const listingId = document.forms.steps?.f1?.value || job.listingId || null;
    if (job.phase === "photos-done") {
      render(photosDone(job));
      return;
    }
    if (!job.photos?.length) {
      await setJob({ ...job, phase: "photos-done", listingId, uploaded: 0 });
      render({
        title: "Стъпка 2: няма избрани снимки",
        text: "Добавете снимки ръчно, ако искате. „ПРОДЪЛЖИ“ тук ПУБЛИКУВА обявата — натиснете го, когато сте готови.",
        warn: true,
      });
      return;
    }
    const already = await call("photoCount");
    if (already > 0 && job.phase === "photos") {
      // the page was reloaded during the upload: do not upload the same photos twice
      render({
        title: "Стъпка 2",
        text: `В обявата вече има ${already} снимки. Проверете ги; добавете липсващите ръчно.`,
        warn: true,
      });
      return;
    }
    await setJob({ ...job, phase: "photos", listingId });
    render({ title: "Стъпка 2: снимки", text: `Тегля ${job.photos.length} снимки от сайта…` });
    const r = await chrome.runtime.sendMessage({ type: "photos", urls: job.photos });
    if (!r?.ok) {
      render({ title: "Снимките не се изтеглиха", text: r?.error ?? "Грешка", warn: true });
      return;
    }
    const up = await call("upload", { files: r.files });
    const next = { ...job, phase: "photos-done", listingId, uploaded: up?.uploaded ?? 0, uploadError: up?.error };
    await setJob(next);
    render(photosDone(next));
  }

  const photosDone = (job) => ({
    title: job.uploadError ? "Не всички снимки са качени" : `Качени снимки: ${job.uploaded}`,
    text:
      (job.uploadError ? `${job.uploadError}\n` : "") +
      "Проверете снимките (първата е главна). „ПРОДЪЛЖИ“ тук ПУБЛИКУВА обявата — натиснете го, когато сте готови.",
    warn: !!job.uploadError,
  });

  async function step3(job) {
    if (job.phase !== "photos-done" && job.phase !== "photos") return;
    const link = [...document.querySelectorAll("a")].find((a) => /Преглед на обявата/i.test(a.textContent ?? ""));
    const url = link?.href ? new URL(link.href, window.location.href).href.replace(/^http:/, "https:") : null;
    const listingId = url?.match(/obiava-(\d+)/)?.[1] ?? job.listingId ?? null;
    const reports = (await get("reports")) ?? {};
    reports[`${job.carId}-${job.startedAt}`] = { carId: job.carId, listingId, url, at: new Date().toISOString() };
    await chrome.storage.local.set({ reports });
    await clearJob();
    render({
      title: "Обявата е публикувана",
      text:
        "Записах я в админ панела (ще се види, когато страницата на колата е отворена). " +
        "Промотирането (VIP, ТОП) избирате тук сами — разширението не пипа нищо на тази стъпка.",
      cancel: false,
    });
  }

  run().catch((e) => render({ title: "Грешка в разширението", text: String(e?.message ?? e), warn: true }));
})();
