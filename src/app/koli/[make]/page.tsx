import type { Metadata } from "next";
import { landingMetadata, SeoLanding } from "@/components/seo-landing";

/** A make's landing page (e.g. /koli/hyundai): its models, its cars, the inquiry form. */
export function generateMetadata({ params, searchParams }: PageProps<"/koli/[make]">): Promise<Metadata> {
  return landingMetadata(params, searchParams);
}

export default function MakePage({ params, searchParams }: PageProps<"/koli/[make]">) {
  return <SeoLanding params={params} searchParams={searchParams} />;
}
