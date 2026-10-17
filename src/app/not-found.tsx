import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-accent uppercase">404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Страницата не е намерена</h1>
      <p className="mt-3 text-muted">Колата може вече да е продадена или линкът да е грешен.</p>
      <Link href="/cars" className="btn-primary mt-8">
        Към каталога
      </Link>
    </div>
  );
}
