import { ImageResponse } from "@vercel/og";
import { createElement as h } from "react";

export const config = { runtime: "edge" };

const BG = "#0A0A0B";
const ACCENT = "#7C5CFF";
const FG = "#F5F5F7";
const MUTED = "#A1A1AA";

const MAX_TITLE = 120;
const MAX_SUBTITLE = 160;

function clamp(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default function handler(request) {
  const { searchParams } = new URL(request.url);
  const title = clamp(searchParams.get("title"), MAX_TITLE) || "Inteligência Artificial para empresas";
  const subtitle = clamp(searchParams.get("subtitle"), MAX_SUBTITLE);

  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: BG,
          backgroundImage: `radial-gradient(circle at 80% 0%, rgba(124,92,255,0.28), transparent 45%)`,
        },
      },
      h(
        "div",
        { style: { display: "flex", alignItems: "center" } },
        h(
          "div",
          {
            style: {
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: FG,
              textTransform: "uppercase",
            },
          },
          "Amplify"
        ),
        h("div", {
          style: { width: 14, height: 14, borderRadius: 999, backgroundColor: ACCENT, marginLeft: 14 },
        })
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        h(
          "div",
          {
            style: {
              fontSize: title.length > 70 ? 60 : 76,
              fontWeight: 800,
              lineHeight: 1.05,
              color: FG,
              maxWidth: "1000px",
            },
          },
          title
        ),
        subtitle
          ? h(
              "div",
              { style: { fontSize: 32, color: MUTED, marginTop: 28, maxWidth: "960px", lineHeight: 1.3 } },
              subtitle
            )
          : null
      ),
      h(
        "div",
        { style: { display: "flex", alignItems: "center", fontSize: 28, color: MUTED } },
        h("div", { style: { width: 40, height: 4, borderRadius: 999, backgroundColor: ACCENT, marginRight: 18 } }),
        "amplify.ia.br"
      )
    ),
    { width: 1200, height: 630 }
  );
}
