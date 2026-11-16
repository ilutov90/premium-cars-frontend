import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { getShareImage, resolveBackendUrl } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

// The preview image when a page without its own photo is shared (Facebook, Viber, Messenger): the picture uploaded in
// the admin panel, else the generated default. It reads the backend per request (`connection()` keeps the route out of
// the build-time prerender), so a new picture shows within the cache time below.
export async function GET() {
  await connection();
  const uploaded = await uploadedImage();
  if (uploaded) return uploaded;
  return defaultImage();
}

async function uploadedImage(): Promise<Response | null> {
  try {
    const url = await getShareImage();
    if (!url) return null;
    const res = await fetch(resolveBackendUrl(url), { cache: "no-store" });
    const type = res.headers.get("content-type")?.split(";")[0].trim() ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    return new Response(await res.arrayBuffer(), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return null;
  }
}

// Latin text only: the built-in font has no Cyrillic.
function defaultImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#121316",
          color: "#f4f1ec",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 20,
              background: "#f4f1ec",
              color: "#121316",
              fontSize: 44,
              fontWeight: 800,
            }}
          >
            PC
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 800 }}>Premium Cars</div>
            <div style={{ fontSize: 22, letterSpacing: 8, color: "#9a9ca3" }}>IMPORT</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: "#c8552b", fontWeight: 700 }}>
            SOUTH KOREA · CHINA → BULGARIA
          </div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{new URL(SITE_URL).host}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
