"use client";

import { useState } from "react";
import type { CarSearch } from "@/lib/api";
import type { FilterOptions } from "@/lib/types";
import { fuelShortLabels } from "@/lib/format";

const thisYear = new Date().getFullYear();
const years = Array.from({ length: thisYear + 1 - 2005 }, (_, i) => thisYear + 1 - i);

/** The short search: make, model (the make's own), year from-to and fuel. Fields of a GET form to /cars. */
export function BasicSearchFields({
  options,
  current = {},
  idPrefix,
}: {
  options: FilterOptions;
  current?: CarSearch;
  idPrefix: string;
}) {
  const [make, setMake] = useState(current.make ?? "");
  const knownMake = options.makes.find((m) => m.toLowerCase() === make.toLowerCase());
  const models = knownMake ? (options.models[knownMake] ?? []) : [];

  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}-make`}>
          Марка
        </label>
        <select
          id={`${idPrefix}-make`}
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
        <label className="label" htmlFor={`${idPrefix}-model`}>
          Модел
        </label>
        {/* a new make starts with all its models */}
        <select
          key={knownMake ?? ""}
          id={`${idPrefix}-model`}
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

      <div>
        <label className="label" htmlFor={`${idPrefix}-fuel`}>
          Гориво / двигател
        </label>
        <select id={`${idPrefix}-fuel`} name="fuelType" defaultValue={current.fuelType ?? ""} className="field">
          <option value="">Всички</option>
          {options.fuelTypes.map((f) => (
            <option key={f} value={f}>
              {fuelShortLabels[f]}
            </option>
          ))}
        </select>
      </div>
    </>
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
