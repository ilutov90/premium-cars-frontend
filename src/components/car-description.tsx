import { descriptionLines, locationLine, shortTitle } from "@/lib/description";
import { formatEur, formatNumber } from "@/lib/format";
import { phoneHref, site, whyUs } from "@/lib/site";
import type { CarSpecs, Origin } from "@/lib/types";

/**
 * The car's description in the same format as the Facebook/Instagram posts: headline, final price,
 * spec lines, where the car is, why buy from us, contacts. The admin's own notes follow, if any.
 */
export function CarDescription({
  specs,
  origin,
  priceEur,
}: {
  specs: CarSpecs;
  origin: Origin | null;
  priceEur: number | null;
}) {
  const location = locationLine(origin);
  return (
    <section className="mt-10">
      <h2 className="text-xl font-extrabold">Описание</h2>
      <div className="mt-4 space-y-5 rounded-2xl border border-line bg-card p-5 leading-relaxed">
        <div className="space-y-1">
          <p className="text-lg font-bold">🎯{shortTitle(specs)}</p>
          <p>
            🔢Крайна цена: 💰 <strong>{formatEur(priceEur)}</strong>
            {priceEur != null && (
              <> с включен транспорт и всички допълнителни разходи до България + Карго застраховка и Технотест‼️</>
            )}
          </p>
          <ul className="pt-1">
            {descriptionLines(specs, formatNumber, "км").map((l) => (
              <li key={l.label ?? l.text}>
                {l.icon}
                {l.label && <span className="text-muted">{l.label}: </span>}
                <span className="font-semibold">{l.text}</span>
              </li>
            ))}
          </ul>
          {location && <p className="pt-1 font-semibold">{location}</p>}
        </div>

        {specs.description && <p className="whitespace-pre-line text-ink-soft">{specs.description}</p>}

        <div className="border-t border-line pt-4">
          <p className="font-bold">❓ Защо {site.brandName} 👑</p>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {whyUs.map((w) => (
              <li key={w.text}>
                {w.icon} {w.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4 text-[15px]">
          <span>
            📞 Офис {site.office}:{" "}
            <a href={phoneHref(site.phone)} className="font-semibold text-accent hover:underline">
              {site.phone}
            </a>{" "}
            или Viber
          </span>
          <a href={site.viberLink} target="_blank" rel="noreferrer" className="btn-ghost px-4! py-1.5!">
            💬 Viber канал
          </a>
        </div>
      </div>
    </section>
  );
}
