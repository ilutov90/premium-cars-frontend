// Runs on cars.bg (isolated world): fills "Публикувай обява" (one page) from the job the admin panel started,
// uploads the photos, and shows what it did in a small panel. It never presses "Публикувай" (that publishes at
// once): the admin checks the form and presses it. When the offer page opens afterwards (/offer/{id}?myoffer=1)
// the offer is reported to the admin panel. On request ("refresh") it reads cars.bg's makes and models.
(() => {
  const JOB = "carsBgJob";
  let seq = 0;
  const pending = new Map();
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
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "pci-main") return;
    const resolve = pending.get(event.data.id);
    if (resolve) {
      pending.delete(event.data.id);
      resolve(event.data.result);
    }
  });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const get = async (key) => (await chrome.storage.local.get(key))[key];
  const setJob = (job) => chrome.storage.local.set({ [JOB]: job });
  const clearJob = () => chrome.storage.local.remove(JOB);

  async function pageScriptReady() {
    for (let i = 0; i < 25; i++) {
      if ((await call("ping", {}, 200)) !== null) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ panel

  let box;
  function render({ title, text, done = [], missing = [], warn = false, cancel = true, buttons = [] }) {
    if (!box) {
      box = document.createElement("div");
      box.style.cssText =
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;width:360px;max-height:70vh;overflow:auto;" +
        "background:#15151a;color:#f6f4ef;font:13px/1.45 system-ui,sans-serif;border-radius:14px;" +
        "box-shadow:0 10px 30px rgba(0,0,0,.35);padding:14px 16px";
      document.body.appendChild(box);
    }
    const b = box;
    b.replaceChildren();
    const h = document.createElement("div");
    h.style.cssText = "font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;gap:8px";
    h.textContent = "Premium Cars → cars.bg";
    const x = document.createElement("button");
    x.textContent = "✕";
    x.title = "Скрий";
    x.style.cssText = "background:none;border:0;color:#f6f4ef99;cursor:pointer;font-size:14px";
    x.onclick = () => {
      b.remove();
      box = null;
    };
    h.appendChild(x);
    b.appendChild(h);
    const t = document.createElement("div");
    t.style.cssText = `font-weight:600;margin-bottom:4px;color:${warn ? "#ffb59a" : "#9be3b4"}`;
    t.textContent = title;
    b.appendChild(t);
    const p = document.createElement("div");
    p.style.whiteSpace = "pre-line";
    p.textContent = text ?? "";
    b.appendChild(p);
    const list = (label, items, open, color) => {
      if (!items.length) return;
      const d = document.createElement("details");
      d.open = open;
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
    list("Не са попълнени — попълнете ги ръчно", missing, true, "#ffb59a");
    list("Попълнено", done, false, "#f6f4efaa");
    const button = (label, onClick) => {
      const c = document.createElement("button");
      c.textContent = label;
      c.style.cssText =
        "margin:10px 6px 0 0;background:none;border:1px solid #f6f4ef44;color:#f6f4ef;border-radius:999px;" +
        "padding:4px 10px;cursor:pointer;font-size:12px";
      c.onclick = onClick;
      b.appendChild(c);
    };
    for (const [label, onClick] of buttons) button(label, onClick);
    if (cancel) {
      button("Спри качването от админ панела", async () => {
        await clearJob();
        render({ title: "Спряно", text: "Разширението няма да попълва повече тази обява.", cancel: false });
      });
    }
  }

  // ------------------------------------------------------------------ the makes and models

  /** The admin panel asked to read cars.bg's lists again (page "Съпоставяне на модели"). */
  async function refreshRequested() {
    const refresh = (await get("refresh")) ?? {};
    if (!refresh.CARS_BG) return false;
    if (Date.now() - refresh.CARS_BG > 30 * 60 * 1000) {
      delete refresh.CARS_BG;
      await chrome.storage.local.set({ refresh });
      return false;
    }
    return true;
  }

  /** Every make of the form, and its models one request at a time (cars.bg's own list endpoint, paced). */
  async function captureCatalog() {
    const brands = (await call("brands")) ?? [];
    if (!brands.length) {
      render({ title: "Марките не са намерени", text: "Влезте в профила и отворете „Публикувай обява“.", warn: true, cancel: false });
      return false;
    }
    const out = [];
    for (const [i, b] of brands.entries()) {
      render({ title: "Чета списъците на cars.bg", text: `Марка ${i + 1} от ${brands.length}: ${b.name}`, cancel: false });
      const url = new URL(`/carmodelpublish.php?brandId=${encodeURIComponent(b.id)}`, window.location.href);
      let models = [];
      try {
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const doc = new DOMParser().parseFromString(await res.text(), "text/html");
          models = [...doc.querySelectorAll("input[name=modelId]")]
            .filter((i) => /^[1-9]\d*$/.test(i.value))
            .map((i) => {
              const l = i.id ? doc.querySelector(`label[for="${CSS.escape(i.id)}"]`) : null;
              return { id: i.value, name: (l?.textContent ?? i.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim() };
            })
            .filter((m) => m.name);
        }
      } catch {
        // this make without models: read again next time
      }
      out.push({ id: b.id, name: b.name, models });
      await sleep(350);
    }
    await chrome.storage.local.set({ carsBgCatalog: { brands: out, capturedAt: new Date().toISOString() } });
    const refresh = (await get("refresh")) ?? {};
    delete refresh.CARS_BG;
    await chrome.storage.local.set({ refresh });
    const models = out.reduce((n, b) => n + b.models.length, 0);
    render({
      title: "Списъците на cars.bg са прочетени",
      text: `${out.length} марки, ${models} модела, изпратени към админ панела. Можете да затворите този таб.`,
      cancel: false,
    });
    return true;
  }

  // ------------------------------------------------------------------ the offer

  const isOfferPage = () => /^\/offer\/[0-9a-f]{24}/i.test(window.location.pathname);
  const isPublishPage = () => /^\/publishcar\.php/i.test(window.location.pathname);

  async function run() {
    if (!(await pageScriptReady())) return;
    let job = await get(JOB);
    if (job && Date.now() - (job.startedAt ?? 0) > 24 * 3600 * 1000) {
      await clearJob(); // a job left over for a day is not continued
      job = null;
    }

    if (isOfferPage()) {
      if (job && job.phase !== "open" && new URLSearchParams(window.location.search).get("myoffer") === "1") {
        await published(job);
      }
      return;
    }

    if (isPublishPage() && (await call("isForm"))) {
      if (await refreshRequested()) await captureCatalog();
      if (job) await fillForm(job);
      return;
    }

    if (job || (await refreshRequested())) {
      // once per tab: a login page may come first
      let navigated = true;
      try {
        navigated = sessionStorage.getItem("pci-nav") === String(job?.startedAt ?? "refresh");
        sessionStorage.setItem("pci-nav", String(job?.startedAt ?? "refresh"));
      } catch {
        // no session storage: do not navigate
      }
      if (!navigated && !/login|register/i.test(window.location.pathname)) {
        window.location.href = "https://www.cars.bg/publishcar.php?fromothersection=1";
        return;
      }
      render({
        title: job ? `Качване на ${job.title ?? "кола"}` : "Четене на списъците на cars.bg",
        text: "Влезте в профила на автокъщата и отворете „Публикувай обява“ → „Автомобили“.",
        cancel: !!job,
      });
    }
  }

  async function fillForm(job) {
    render({ title: `Качване на ${job.title ?? "кола"}`, text: "Попълвам формата…" });
    await call("prepare");
    const r = await call("fill", { values: job.values, extras: job.extras });
    if (!r || r.error) {
      render({ title: "Формата не се попълни", text: r?.error ?? "Няма отговор от страницата", warn: true });
      return;
    }
    job = { ...job, phase: job.phase === "open" ? "filled" : job.phase };
    await setJob(job);
    await photos(job, r);
  }

  async function photos(job, filled) {
    const finish = (extra = "", warn = false) =>
      render({
        title: warn ? "Формата е попълнена, снимките — не всички" : "Формата е попълнена",
        text:
          (extra ? `${extra}\n` : "") +
          "Проверете полетата и снимките (първата е главна) и натиснете „Публикувай“ най-долу, когато сте готови. " +
          "Разширението не го натиска. След публикуването обявата се записва в админ панела.",
        done: filled.done ?? [],
        missing: filled.missing ?? [],
        warn: warn || (filled.missing ?? []).length > 0,
      });

    if (job.phase === "photos-done") return finish(`Качени снимки: ${job.uploaded ?? 0}.`);
    if (!job.photos?.length) {
      await setJob({ ...job, phase: "photos-done", uploaded: 0 });
      return finish("Няма избрани снимки: добавете ги ръчно.", true);
    }
    const already = (await call("photoCount")) ?? 0;
    if (already > 0 && !job.uploadAnyway) {
      // cars.bg keeps the photos of an unfinished offer: do not add the car's photos to someone else's
      render({
        title: `В черновата вече има ${already} снимки`,
        text:
          "Те са от предишен опит (cars.bg ги пази). Изтрийте ги в cars.bg, ако не са на тази кола, и натиснете " +
          "„Качи снимките“. Ако са на тази кола, натиснете „Без качване“.",
        done: filled.done ?? [],
        missing: filled.missing ?? [],
        warn: true,
        buttons: [
          ["Качи снимките", async () => {
            const next = { ...job, uploadAnyway: true };
            await setJob(next);
            await photos(next, filled);
          }],
          ["Без качване", async () => {
            const next = { ...job, phase: "photos-done", uploaded: 0 };
            await setJob(next);
            finish("Снимките не са качвани.");
          }],
        ],
      });
      return;
    }
    await setJob({ ...job, phase: "photos" });
    render({ title: "Снимки", text: `Тегля ${job.photos.length} снимки от сайта…`, cancel: false });
    const r = await chrome.runtime.sendMessage({ type: "photos", urls: job.photos, site: "CARS_BG" });
    if (!r?.ok) {
      await setJob({ ...job, phase: "filled" });
      return finish(`Снимките не се изтеглиха: ${r?.error ?? "грешка"}`, true);
    }
    let uploaded = 0;
    let error = null;
    for (const [i, file] of r.files.entries()) {
      render({ title: "Снимки", text: `Качване на снимка ${i + 1} от ${r.files.length}…`, cancel: false });
      const up = await call("uploadOne", { file, index: i }, 90000);
      if (!up?.ok) {
        error = up?.error ?? `Снимка ${i + 1} не се качи`;
        break;
      }
      uploaded++;
    }
    await setJob({ ...job, phase: "photos-done", uploaded });
    finish(error ? `${error}. Качени: ${uploaded} от ${r.files.length}; добавете останалите ръчно.` : `Качени снимки: ${uploaded}.`, !!error);
  }

  async function published(job) {
    const offerId = window.location.pathname.match(/^\/offer\/([0-9a-f]{24})/i)?.[1]?.toLowerCase() ?? null;
    const url = offerId ? `https://www.cars.bg/offer/${offerId}` : null;
    const reports = (await get("carsBgReports")) ?? {};
    reports[`${job.carId}-${job.startedAt}`] = { carId: job.carId, offerId, url, at: new Date().toISOString() };
    await chrome.storage.local.set({ carsBgReports: reports });
    await clearJob();
    render({
      title: "Обявата е публикувана",
      text: "Записах я в админ панела (ще се види, когато страницата на колата е отворена). cars.bg може първо да я провери.",
      cancel: false,
    });
  }

  run().catch((e) => render({ title: "Грешка в разширението", text: String(e?.message ?? e), warn: true }));
})();
