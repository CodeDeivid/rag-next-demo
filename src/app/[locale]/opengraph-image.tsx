import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "RAG Next Demo";

// Same path as the logo mark (src/features/brand/components/app-logo.tsx); change both together.
const LOGO_MARK_PATH = "M7.5 4H5v16h2.5M16.5 4H19v16h-2.5M9.5 9h5M9.5 15h4";

/** Link preview for WhatsApp, LinkedIn and Slack, in the page's language. */
export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0b0b0c",
        color: "#fafafa",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg
          width="72"
          height="72"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a78bfa"
          strokeWidth={2.5}
        >
          <path d={LOGO_MARK_PATH} />
        </svg>
        <div style={{ fontSize: 44, fontWeight: 700 }}>{t("appName")}</div>
      </div>
      <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.15, maxWidth: 980 }}>
        {t("tagline")}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 26, color: "#a3a3a3" }}>
        {["Next.js", "AI SDK", "pgvector", "[1] [2]"].map((tag) => (
          <div
            key={tag}
            style={{ border: "2px solid #262626", borderRadius: 999, padding: "8px 22px" }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
