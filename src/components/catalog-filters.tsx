"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import type { CarSearch } from "@/lib/api";
import type { FilterOptions } from "@/lib/types";
import { fuelShortLabels, originLabels, transmissionLabels } from "@/lib/format";

/** The filters of the extended search; it opens by itself when one of them is set. */
const EXTENDED_KEYS = ["q", "origin", "transmission", "priceFrom", "priceTo", "mileageTo"];

const thisYear = new Date().getFullYear();
const years = Array.from({ length: thisYear + 1 - 2005 }, (_, i) => thisYear + 1 - i);

/**
 * GET form: filters live in the URL, so every filtered view can be shared and indexed. The short search is make,
 * model, year and fuel; "Разширено търсене" shows the rest.
 */
export function CatalogFilters({ options, current }: { options: FilterOptions; current: CarSearch }) {
  const [extended, setExtended] = useState(() => EXTENDED_KEYS.some((k) => !!current[k]));
  const [make, setMake] = useState(current.make ?? "");
  const knownMake = options.makes.find((m) => m.toLowerCase() === make.toLowerCase());
  const models = knownMake ? (options.models[knownMake] ?? []) : [];

  return (
    <Form action="/cars" className="space-y-4 rounded-2xl border border-line bg-card p-5">
      <div>
        <label className="label" htmlFor="f-make">
          Марка
        </label>
        <select
          id="f-make"
          name="make"
          value={knownMake ?? ""}
          onChange={(e) => setMake(e.target.value)}
          className="field"
        >
          <option value="">Всички</option>
          {options.makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="f-model">
          Модел
        </label>
        {/* a new make starts with all its models */}
        <select
          key={knownMake ?? ""}
          id="f-model"
          name="model"
          defaultValue={knownMake && knownMake.toLowerCase() === current.make?.toLowerCase() ? current.model : ""}
          disabled={!knownMake}
          className="field disabled:opacity-50"
        >
          <option value="">{knownMake ? "Всички" : "Първо изберете марка"}</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Година</legend>
        <div className="grid grid-cols-2 gap-2">
          <YearSelect name="yearFrom" value={current.yearFrom} placeholder="от" />
          <YearSelect name="yearTo" value={current.yearTo} placeholder="до" />
        </div>
      </fieldset>

      <Select id="f-fuel" name="fuelType" label="Гориво / двигател" value={current.fuelType}>
        {options.fuelTypes.map((f) => (
          <option key={f} value={f}>
            {fuelShortLabels[f]}
          </option>
        ))}
      </Select>

      {extended && (
        <div className="space-y-4 border-t border-line pt-4">
          <div>
            <label className="label" htmlFor="f-q">
              Търсене по текст
            </label>
            <input id="f-q" name="q" defaultValue={current.q} placeholder="напр. Tucson" className="field" />
          </div>

          <Select id="f-origin" name="origin" label="Произход" value={current.origin}>
            {options.origins.map((o) => (
              <option key={o} value={o}>
                {originLabels[o]}
              </option>
            ))}
          </Select>

          <Select id="f-gear" name="transmission" label="Скоростна кутия" value={current.transmission}>
            {options.transmissions.map((t) => (
              <option key={t} value={t}>
                {transmissionLabels[t]}
              </option>
            ))}
          </Select>

          <Range label="Цена, €" from={["priceFrom", current.priceFrom, "от"]} to={["priceTo", current.priceTo, "до"]} />

          <div>
            <label className="label" htmlFor="f-km">
              Пробег до, км
            </label>
            <input
              id="f-km"
              name="mileageTo"
              type="number"
              min={0}
              step={5000}
              defaultValue={current.mileageTo}
              className="field"
            />
          </div>
        </div>
      )}

      {current.sort && <input type="hidden" name="sort" value={current.sort} />}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary flex-1">
          Покажи
        </button>
        <Link href="/cars" className="btn-ghost">
          Изчисти
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setExtended((v) => !v)}
        aria-expanded={extended}
        className="w-full text-center text-sm font-semibold text-accent hover:underline"
      >
        {extended ? "Скрий разширеното търсене ↑" : "Разширено търсене ↓"}
      </button>
    </Form>
  );
}

function YearSelect({ name, value, placeholder }: { name: string; value?: string; placeholder: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={`Година ${placeholder}`} className="field">
      <option value="">{placeholder}</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function Select({
  id,
  name,
  label,
  value,
  children,
}: {
  id: string;
  name: string;
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={value ?? ""} className="field">
        <option value="">Всички</option>
        {children}
      </select>
    </div>
  );
}

type RangeEnd = [name: string, value: string | undefined, placeholder: string];

function Range({ label, from, to }: { label: string; from: RangeEnd; to: RangeEnd }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[from, to].map(([name, value, placeholder]) => (
          <input
            key={name}
            name={name}
            type="number"
            min={0}
            defaultValue={value}
            placeholder={placeholder}
            aria-label={`${label} ${placeholder}`}
            className="field"
          />
        ))}
      </div>
    </fieldset>
  );
}
