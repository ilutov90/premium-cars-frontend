// Runs in mobile.bg's own page (world MAIN), because the form needs the page's functions: changemm() fills the
// models of a brand from the page's cmm array, pubEngineType() shows the electric fields, Plupload uploads photos.
// It only acts on requests from the extension's other script (mobilebg.js) and never presses a button.
(() => {
  const SELECTS = ["f8", "f25", "f29", "f10", "f11", "f31", "f13", "f14", "f15", "f17", "f18", "f19"];
  const reply = (id, result) => window.postMessage({ source: "pci-main", id, result }, window.location.origin);
  const form = () => document.forms.pub;

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== "pci-iso") return;
    try {
      if (msg.type === "capture") reply(msg.id, capture());
      else if (msg.type === "region") reply(msg.id, setRegion(msg.region));
      else if (msg.type === "fill") reply(msg.id, fill(msg.values, msg.extras));
      else if (msg.type === "upload") reply(msg.id, await upload(msg.files));
      else if (msg.type === "photoCount") reply(msg.id, photoCount());
    } catch (e) {
      reply(msg.id, { error: String(e?.message ?? e) });
    }
  });

  /** mobile.bg's lists from the form: brands/models, select options, extras checkboxes. */
  function capture() {
    const f = form();
    if (!f || !f.f5) return null;
    const rows = Array.isArray(window.cmm) && Array.isArray(window.cmm[0]) ? window.cmm[0] : [];
    const brands = rows
      .filter((r) => Array.isArray(r) && r[0])
      .map((r) => ({ name: String(r[0]), models: r.slice(2).filter(Boolean).map(String) }));
    const selects = {};
    for (const name of SELECTS) {
      const el = f[name];
      if (!el || !el.options) continue;
      selects[name] = [...el.options].filter((o) => o.value !== "").map((o) => ({ value: o.value, text: o.text.trim() }));
    }
    const extras = [...f.querySelectorAll("input[type=checkbox]")]
      .filter((c) => /^f\d+$/.test(c.name) && Number(c.name.slice(1)) >= 35 && Number(c.name.slice(1)) <= 130)
      .map((c) => ({ field: c.name, value: c.value }));
    return { brands, selects, extras, capturedAt: new Date().toISOString() };
  }

  const norm = (s) => String(s ?? "").toLowerCase().replace(/^(обл\.|гр\.|с\.)\s*/, "").replace(/\s+/g, " ").trim();

  /** Picks the option whose value or text is the wanted one (then one that contains it); false when none. */
  function choose(el, wanted) {
    if (!el || wanted == null || wanted === "") return false;
    const w = String(wanted);
    const opts = [...el.options];
    const hit =
      opts.find((o) => o.value === w) ||
      opts.find((o) => o.text.trim() === w) ||
      opts.find((o) => norm(o.value) === norm(w) || norm(o.text) === norm(w)) ||
      opts.find((o) => o.value !== "" && norm(o.text).includes(norm(w)));
    if (!hit) return false;
    el.value = hit.value;
    return true;
  }

  /** Changing "Намира се в" makes mobile.bg reload the form (it keeps the values): done first, on its own. */
  function setRegion(region) {
    const f = form();
    if (!f || !f.f18) return { ok: false };
    if (!choose(f.f18, region)) return { ok: false };
    f.f18.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }

  function text(el, value, max) {
    if (!el || value == null || value === "") return false;
    el.value = max ? String(value).slice(0, max) : String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  /** Fills step 1 from the admin panel's values; returns what was set and what was not found. */
  function fill(v, extras) {
    const f = form();
    if (!f || !f.f5) return { error: "Формата на mobile.bg не е намерена" };
    const done = [];
    const missing = [];
    const sel = (label, name, value) => {
      if (value == null || value === "") return;
      (choose(f[name], value) ? done : missing).push(`${label}: ${value}`);
    };
    const txt = (label, name, value, max) => {
      if (value == null || value === "") return;
      (text(f[name], value, max) ? done : missing).push(`${label}: ${value}`);
    };

    if (choose(f.f5, v.brand)) {
      done.push(`Марка: ${v.brand}`);
      if (typeof window.changemm === "function") window.changemm(f.topmenu, f.f5, f.f6, "1", "1");
      sel("Модел", "f6", v.model);
    } else if (v.brand) {
      missing.push(`Марка: ${v.brand}`);
    }
    txt("Модификация", "f7", v.modification, 50);
    if (choose(f.f8, v.engineType)) {
      done.push(`Двигател: ${v.engineType}`);
      if (typeof window.pubEngineType === "function") window.pubEngineType(f.f8.value, 33, 34);
    } else if (v.engineType) {
      missing.push(`Двигател: ${v.engineType}`);
    }
    sel("Състояние", "f25", v.condition);
    txt("Мощност", "f9", v.powerHp, 4);
    sel("Евростандарт", "f29", v.euroStandard);
    sel("Скоростна кутия", "f10", v.gearbox);
    sel("Категория", "f11", v.category);
    txt("Кубатура", "f30", v.engineCc);
    txt("Цена", "f12", v.price, 7);
    sel("ДДС", "f31", v.vat);
    sel("Валута", "f13", v.currency);
    txt("Пробег", "f16", v.mileageKm);
    sel("Месец", "f14", v.month);
    sel("Година", "f15", v.year);
    sel("Цвят", "f17", v.color);
    sel("Населено място", "f19", v.city);
    txt("VIN", "f32", v.vin, 17);
    txt("Пробег на ток (WLTP)", "f33", v.rangeKm);
    txt("Батерия (kWh)", "f34", v.batteryKwh);
    txt("Допълнителна информация", "f21", v.description, 11000);
    txt("Телефон", "f22", v.phone);

    const wanted = new Set(extras ?? []);
    let ticked = 0;
    for (const c of f.querySelectorAll("input[type=checkbox]")) {
      if (!/^f\d+$/.test(c.name) || Number(c.name.slice(1)) < 35 || Number(c.name.slice(1)) > 130) continue;
      c.checked = wanted.has(c.value);
      if (c.checked) {
        ticked++;
        wanted.delete(c.value);
      }
    }
    done.push(`Екстри: ${ticked}`);
    for (const x of wanted) missing.push(`Екстра: ${x}`);
    return { done, missing };
  }

  const photoCount = () => document.querySelectorAll("#imgUpload .hasPhoto").length;

  async function toFile(f) {
    let blob = await (await fetch(f.dataUrl)).blob();
    let type = blob.type;
    if (type !== "image/jpeg" && type !== "image/png") {
      // e.g. webp/avif from our storage: mobile.bg's uploader takes JPEG for sure
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      type = "image/jpeg";
    }
    return new File([blob], `${f.name}.${type === "image/png" ? "png" : "jpg"}`, { type });
  }

  /** One photo after the other (the order is the gallery's on mobile.bg), each waiting for its upload. */
  async function upload(files) {
    let uploaded = 0;
    for (const f of files ?? []) {
      const input = document.querySelector("#imgUpload input[type=file]");
      if (!input) return { uploaded, error: "Полето за снимки на mobile.bg не е намерено" };
      const before = photoCount();
      const dt = new DataTransfer();
      dt.items.add(await toFile(f));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      const until = Date.now() + 60000;
      while (photoCount() <= before && Date.now() < until) await new Promise((r) => setTimeout(r, 300));
      if (photoCount() <= before) return { uploaded, error: `Снимка ${uploaded + 1} не се качи за 60 секунди` };
      uploaded++;
      window.postMessage({ source: "pci-main", progress: uploaded, total: files.length }, window.location.origin);
    }
    return { uploaded };
  }
})();
