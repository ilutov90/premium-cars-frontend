import Link from "next/link";
import { Suspense } from "react";
import { getContact, getLogo } from "@/lib/api";
import { logoImageStyle } from "@/lib/logo-style";
import { contactDetails } from "@/lib/site";
import { SiteNav } from "./site-nav";

// The shell is prerendered (Cache Components): the phone and the logo saved in the admin panel stream in; the
// default from site.ts and the built-in logo show until then (or when the backend is down).
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 2xl:max-w-7xl">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Suspense fallback={<BuiltInLogo />}>
            <SavedLogo />
          </Suspense>
        </Link>
        <Suspense fallback={<SiteNav contact={contactDetails(null)} />}>
          <SavedContactNav />
        </Suspense>
      </div>
    </header>
  );
}

async function SavedContactNav() {
  const saved = await getContact();
  return <SiteNav contact={contactDetails(saved)} />;
}

function BuiltInLogo() {
  return (
    <>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm font-extrabold text-paper">PC</span>
      <span className="text-[15px] leading-tight font-bold tracking-tight">
        Premium Cars
        <span className="block text-[11px] font-medium tracking-[0.18em] text-muted uppercase">Import</span>
      </span>
    </>
  );
}

async function SavedLogo() {
  const logo = await getLogo();
  if (!logo?.url) return <BuiltInLogo />;
  // eslint-disable-next-line @next/next/no-img-element -- the logo is served by our backend (/media)
  return <img
      src={logo.url}
      alt="Premium Cars Import"
      style={logoImageStyle(logo)}
      className="w-auto max-w-[11rem] object-contain sm:max-w-[14rem]"
    />;
}
