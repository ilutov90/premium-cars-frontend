import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/seo";

// The default preview image when a page without its own photo is shared (Facebook, Viber, Messenger).
// Prerendered at build time. Latin text only: the built-in font has no Cyrillic.
export function GET() {
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
