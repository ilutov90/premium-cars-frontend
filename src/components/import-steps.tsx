export const importSteps: { title: string; text: string[] }[] = [
  {
    title: "Избор на автомобил",
    text: [
      "Избирате кола от каталога или ни казвате какво търсите и ние го намираме спрямо вашите изисквания за марка, модел, екстри, година и пробег.",
    ],
  },
  {
    title: "Проверка",
    text: [
      "Проверяваме историята, състоянието и документите преди покупка. При желание правим и жива инспекция с наш агент на място, изпращат се допълнително видеа и снимки на автомобила, както и описания на техническото състояние.",
    ],
  },
  {
    title: "Договор и плащане",
    text: [
      "Подписваме договор за посредническа дейност с ясна крайна цена на доставка и срокове. Автомобилът се заплаща на етапи до пристигането му в България.",
      "Първо се заплаща цялата стойност на автомобила в Южна Корея или Китай, преди изпращането му към България. След това се заплаща фактура за транспортни разходи, мито и ДДС.",
      "Финалното плащане се извършва тук в София при получаване на автомобила.",
    ],
  },
  {
    title: "Транспорт и документация",
    text: [
      "Ние уреждаме цялата документация от страната износител, както и целия транспортен процес – морски и сухопътен транспорт до София.",
    ],
  },
  {
    title: "Митница и пристанищни такси",
    text: [
      "Обработваме всички документи и целия процес по обмитяване и документално организиране на автомобила с всички административни такси.",
    ],
  },
  {
    title: "Пристигане и издаване на автомобила",
    text: [
      "Автомобилът пристига на базата ни, като преди това ви съдействаме с изваждане на транзитни номера. След пристигането съдействаме за преминаването на технотест на деня. След което автомобилът може да бъде регистриран в съответния град.",
    ],
  },
];

/** The full guide: a vertical timeline (numbers on the left on a phone, on a centre line with alternating sides on a computer). */
export function ImportSteps() {
  return (
    <ol className="relative mx-auto max-w-5xl">
      <span
        aria-hidden
        className="absolute top-7 bottom-7 left-7 w-0.5 -translate-x-1/2 bg-line md:left-1/2"
      />
      {importSteps.map((step, i) => {
        const right = i % 2 === 1;
        return (
          <li
            key={step.title}
            className="relative grid grid-cols-[auto_1fr] gap-x-4 pb-8 last:pb-0 sm:gap-x-6 md:grid-cols-[1fr_auto_1fr] md:gap-x-10 md:pb-12"
          >
            <span
              aria-hidden
              className="z-10 flex size-14 items-center justify-center rounded-full bg-accent text-2xl font-extrabold text-white ring-8 ring-paper md:col-start-2 md:row-start-1 md:size-16 md:text-3xl"
            >
              {i + 1}
            </span>
            <div
              className={`rounded-2xl border border-line bg-card p-5 sm:p-6 md:row-start-1 ${
                right ? "md:col-start-3" : "md:col-start-1"
              }`}
            >
              <h3 className="text-lg leading-snug font-extrabold tracking-tight sm:text-xl">
                <span className="sr-only">Стъпка {i + 1}: </span>
                {step.title}
              </h3>
              <div className="mt-2 space-y-3 leading-relaxed text-muted">
                {step.text.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Six small cards (number, title, first paragraph) for the home page. */
export function ImportStepsCompact() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {importSteps.map((step, i) => (
        <li key={step.title} className="rounded-2xl border border-line bg-card p-5">
          <span
            aria-hidden
            className="flex size-10 items-center justify-center rounded-full bg-accent text-lg font-extrabold text-white"
          >
            {i + 1}
          </span>
          <h3 className="mt-3 font-bold">
            <span className="sr-only">Стъпка {i + 1}: </span>
            {step.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text[0]}</p>
        </li>
      ))}
    </ol>
  );
}
