import type { Metadata } from "next";
import { landingMetadata, SeoLanding } from "@/components/seo-landing";

/** A model's landing page (e.g. /koli/hyundai/tucson): its cars and the inquiry form. */
export function generateMetadata({ params, searchParams }: PageProps<"/koli/[make]/[model]">): Promise<Metadata> {
  return landingMetadata(params, searchParams);
}

export default function ModelPage({ params, searchParams }: PageProps<"/koli/[make]/[model]">) {
  return <SeoLanding params={params} searchParams={searchParams} />;
}
