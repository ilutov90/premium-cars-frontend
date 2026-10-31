// Runs in cars.bg's own page (world MAIN), because the form needs the page's functions: every list of the form is a
// sub-page of radio buttons kept in sync by syncPagedSelect(), toggleModelSelect() loads a make's models, and the
// photo input uploads each photo by itself. It only acts on requests from the extension's other script (carsbg.js)
// and never presses a button: publishing is the admin's.
(() => {
  const reply = (id, result) => window.postMessage({ source: "pci-main", id, result }, window.location.origin);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const MONTHS = ["Януари", "Февруари", "Март", "Април", "Май", "Юни", "Юли", "Август", "Септември", "Октомври",
    "Ноември", "Декември"];

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== "pci-iso") return;
    try {
      if (msg.type === "ping") reply(msg.id, true);
      else if (msg.type === "isForm") reply(msg.id, !!document.querySelector("input[name=brandId]"));
      else if (msg.type === "brands") reply(msg.id, brands());
      else if (msg.type === "prepare") reply(msg.id, await prepare());
      else if (msg.type === "fill") reply(msg.id, await fill(msg.values, msg.extras));
      else if (msg.type === "photoCount") reply(msg.id, photoCount());
      else if (msg.type === "uploadOne") reply(msg.id, await uploadOne(msg.file, msg.index));
    } catch (e) {
      reply(msg.id, { error: String(e?.message ?? e) });
    }
  });

  const labelOf = (input) => {
    const l = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    return (l?.textContent ?? input.parentElement?.textContent ?? "").replace(/\s+/g, " ").trim();
  };

  /** The makes of the form with their ids. */
  function brands() {
    return [...document.querySelectorAll("input[name=brandId]")]
      .filter((i) => /^\d+$/.test(i.value))
      .map((i) => ({ id: i.value, name: labelOf(i) }))
      .filter((b) => b.name);
  }

  /** The page opens on "Обява за": choose "Продава" (offerfor=1) and go back to the main page. */
  async function prepare() {
    const offer = document.querySelector('input[name="offerfor"][value="1"]');
    if (!offer) return { ok: false };
    if (!offer.checked) offer.checked = true;
    const active = window.registry?.activePage?.attr?.("id");
    if (active && active !== "publishPage" && typeof window.closePublishSubPage === "function" && window.$) {
      window.closePublishSubPage(window.$('input[name="offerfor"]:checked'));
      await sleep(800);
    }
    return { ok: true };
  }

  /** Checks a radio or checkbox and lets the page show the choice (its sub-page's summary). */
  function pick(name, value) {
    const sel = value == null ? `input[name="${name}"]` : `input[name="${name}"][value="${CSS.escape(String(value))}"]`;
    const e = document.querySelector(sel);
    if (!e) return false;
    e.checked = true;
    e.dispatchEvent(new Event("change", { bubbles: true }));
    const page = e.closest(".publish-subpage")?.id;
    const link = page && document.querySelector(`a[sync-data="${page}"]`);
    if (link && typeof window.syncPagedSelect === "function") window.syncPagedSelect(link, page);
    return true;
  }

  function setText(name, value) {
    const e = document.getElementById(name) ?? document.querySelector(`[name="${name}"]`);
    if (!e) return false;
    e.value = value;
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  /** The summary line of a sub-page ("BYD, Atto2"), which the page does not write for values set from a script. */
  function setSummary(selector, text) {
    if (!window.$) return;
    window.$("span", window.$(selector)).first().text(text);
  }

  async function fill(v, extras) {
    const done = [];
    const missing = [];
    const note = (ok, label) => (ok ? done : missing).push(label);

    if (v.brandId) {
      const ok = pick("brandId", v.brandId);
      note(ok, `Марка: ${v.brandName ?? v.brandId}`);
      if (ok && v.modelId) {
        if (typeof window.toggleModelSelect === "function") window.toggleModelSelect(Number(v.brandId));
        const sel = `input[name="modelId"][value="${CSS.escape(String(v.modelId))}"]`;
        for (let i = 0; i < 50 && !document.querySelector(sel); i++) await sleep(200);
        const m = pick("modelId", v.modelId);
        note(m, `Модел: ${v.modelName ?? v.modelId}`);
        if (m) setSummary("#brandselector", `${v.brandName ?? ""}, ${v.modelName ?? ""}`);
      } else if (!v.modelId) {
        missing.push("Модел");
      }
    } else {
      missing.push("Марка и модел");
    }

    const radios = [
      ["stateId", v.stateId, "Състояние"],
      ["conditionId", v.conditionId, "Повреди"],
      ["categoryId", v.categoryId, "Категория"],
      ["fuelId", v.fuelId, "Гориво"],
      ["gearId", v.gearId, "Скоростна кутия"],
      ["doorId", v.doorId, "Врати"],
      ["colorId", v.colorId, "Цвят"],
      ["euroId", v.euroId, "Евростандарт"],
      ["currencyId", v.currencyId, "Валута"],
      ["is_inbg", v.isInBg, "Намира се"],
      ["usageId", v.usageId, "Внос"],
    ];
    for (const [name, value, label] of radios) {
      if (value == null || value === "") {
        if (["categoryId", "fuelId", "gearId", "doorId", "colorId"].includes(name)) missing.push(label);
        continue;
      }
      note(pick(name, value), label);
    }

    if (v.productionYear) {
      const y = pick("production_year", v.productionYear);
      const m = v.monthId ? pick("monthId", v.monthId) : false;
      note(y, `Година: ${v.productionYear}`);
      if (v.monthId) note(m, `Месец: ${MONTHS[Number(v.monthId) - 1] ?? v.monthId}`);
      else missing.push("Месец");
      if (y) setSummary("#yearselector", m ? `${v.productionYear}, ${MONTHS[Number(v.monthId) - 1]}` : String(v.productionYear));
    } else {
      missing.push("Година");
    }

    if (v.metallic) note(pick("metallic", null), "Металик");
    if (v.leasing) note(pick("leasing", null), "Лизинг");
    if (v.barter) note(pick("barter", null), "Бартер");

    for (const [name, label] of [
      ["engine", "Двигател/модификация"],
      ["price", "Цена"],
      ["run", "Пробег"],
      ["power", "Мощност"],
      ["cubature", "Кубатура"],
      ["notes", "Описание"],
    ]) {
      if (v[name] == null || v[name] === "") continue;
      note(setText(name, v[name]), label);
    }

    let checked = 0;
    for (const id of extras ?? []) if (pick("e[]", id)) checked++;
    if (extras?.length) done.push(`Екстри: ${checked} от ${extras.length}`);
    return { done, missing };
  }

  const photoCount = () => document.querySelectorAll(".photobox.haspic").length;

  /** cars.bg takes JPEG only: other images are redrawn as JPEG. */
  async function jpeg(file) {
    const bin = atob(file.dataUrl.split(",")[1] ?? "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    let blob = new Blob([bytes], { type: file.type || "image/jpeg" });
    if (blob.type !== "image/jpeg") {
      const img = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.92));
      if (!blob) throw new Error("Снимката не се преобразува в JPEG");
    }
    return new File([blob], `${file.name}.jpg`, { type: "image/jpeg" });
  }

  /** One photo through the form's own input; waits until the page shows it uploaded. */
  async function uploadOne(file, index) {
    const input = document.getElementById("uploadFile1") ?? document.querySelector("input[type=file]");
    if (!input) return { error: "Полето за снимки не е намерено" };
    const before = photoCount();
    const dt = new DataTransfer();
    dt.items.add(await jpeg(file));
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    for (let i = 0; i < 120; i++) {
      await sleep(500);
      if (photoCount() > before) return { ok: true };
    }
    return { error: `Снимка ${index + 1} не се качи (няма отговор от cars.bg)` };
  }
})();
