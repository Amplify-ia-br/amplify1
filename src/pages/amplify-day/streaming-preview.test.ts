import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/amplify-day/streaming.astro"), "utf8");
const legacyRoute = readFileSync(resolve(process.cwd(), "src/pages/amplify-day/streaming-preview.astro"), "utf8");
const visibleCopy = source
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .toLocaleLowerCase("pt-BR");

describe("Ampl_IA Day streaming preview", () => {
  it("publishes at the definitive streaming route and redirects the former preview", () => {
    expect(legacyRoute).toContain('Astro.redirect("/amplify-day/streaming", 308)');
  });

  it("keeps the Palco AMPL_IA education positioning", () => {
    expect(source).toContain("Palco AMPL_IA");
    expect(source).toContain("Assista<br />ao vivo");
    expect(source).toContain("Transmissão gratuita do Palco AMPL_IA para todo o Brasil.");
    expect(visibleCopy).not.toContain("ouça do mec a direção da ia na educação");
    expect(visibleCopy).not.toContain("uma conversa para quem precisa entender");
    expect(source).toContain("Iara Christina Silva Barroca");
    expect(source).toContain('const eventDate = "23 set 2026 · 15h às 16h30"');
    expect(source).toContain("Online e gratuito");
  });

  it("keeps the main event lockup without duplicating the live signal below the title", () => {
    expect(source).toContain('class="event-lockup-meta"');
    expect(source).toContain('class="event-by"');
    expect(source).toContain("Transmissão ao vivo");
    expect(source).not.toContain('class="live-signal"');
    expect(source).not.toContain("23 set</b>");
    expect(source).toContain(".event-lockup-meta{display:flex;align-items:center;justify-content:flex-end");
  });

  it("does not reintroduce the rejected narrative", () => {
    expect(visibleCopy).not.toContain("adoção institucional");
    expect(visibleCopy).not.toContain("capacidade institucional");
  });

  it("stays non-indexable and submits registrations to the streaming API", () => {
    expect(source).toContain('name="robots" content="noindex, nofollow, noarchive"');
    expect(source).toContain('fetch("/api/amplify-day-streaming"');
    expect(source).toContain("utm_campaign:params.get");
  });

  it("uses the official realization row with XC support and no TEIA", () => {
    expect(source).toContain("Realização: X-VIA, Amplify e Shock Wave");
    expect(source).toContain('alt="XC Studio"');
    expect(visibleCopy).not.toContain("teia");
  });

  it("uses the event-level hero and keeps Iara exclusively in the lineup", () => {
    expect(source).toContain('id="lineup"');
    expect(source).toContain("Gustavo Wigman");
    expect(source).toContain("Rafael Lacerda");
    expect(source).toContain("Prof. Álvaro");
    expect(source).toContain("De Brasília para o Brasil");

    const hero = source.match(/<section class="hero"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(source).toContain("iara-barroca-transparent.webp");
    expect(hero).not.toContain("Iara Christina Silva Barroca");
    expect(hero).not.toContain("iara-barroca-transparent.webp");
    expect(hero).toContain('class="hero-date"');
    expect(hero).toContain('class="date-number"');
    expect(hero).toContain("catedral-tres-poderes");
    expect(hero).toContain("Streaming ao vivo dos nossos estúdios em Brasília");
    expect(hero).not.toContain("<figcaption>Brasília · DF</figcaption>");
  });

  it("uses one real Kit-backed modal form from every CTA", () => {
    expect(source.match(/<form data-streaming-form/g)).toHaveLength(1);
    expect(source.match(/data-open-form/g)?.length).toBeGreaterThanOrEqual(4);
    expect(source).toContain("data-floating-cta");
    expect(source).toContain("data-closing-cta");
    expect(source).toContain('e.key==="Escape"');
    expect(source).toContain("Cadastro confirmado.");
    expect(source).not.toContain("Nenhum dado foi enviado ou armazenado.");
  });

  it("gives Iara a photo-left feature with transparent portraits and the other participants below", () => {
    expect(source).toContain("Quem participa dessa conversa.");
    expect(source).toContain("Debatedora em destaque");
    expect(source).toContain(".feature-speaker{position:relative;display:grid");
    expect(source).toMatch(/<article class="feature-speaker"><figure>[\s\S]*?<\/figure><div>/);
    expect(source).toContain(".feature-speaker>figure img{position:absolute");
    expect(source).toContain(".feature-speaker>figure:before,.feature-speaker>figure:after{display:none}");
    expect(source.match(/-transparent\.webp/g)).toHaveLength(4);
    expect(source).toContain("prof-alvaro-complete-transparent.webp");
    expect(source).toContain("grid-template-columns:minmax(300px,1fr) minmax(0,2fr)");
    expect(source).toContain("speaker.name === \"Prof. Álvaro\"");
    expect(source).toContain("width: 1050, height: 1498");
    expect(source).toContain(".speaker-stack{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))");
  });
});
