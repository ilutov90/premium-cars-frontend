import type { PostedChannel } from "@/lib/types";

const networkLabels: Record<PostedChannel["network"], string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  VIBER: "Viber",
  MOBILE_BG: "mobile.bg",
  CARS_BG: "cars.bg",
};

/** Where a car was posted through the admin panel, each a link to the post when known. */
export function PostedChips({ posted }: { posted: PostedChannel[] }) {
  if (posted.length === 0) return <span className="text-xs text-muted">не е публикувана през панела</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {posted.map((p, i) =>
        p.url ? (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-dark hover:underline"
          >
            {networkLabels[p.network]} ↗
          </a>
        ) : (
          <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent-dark">
            {networkLabels[p.network]}
          </span>
        ),
      )}
    </span>
  );
}
