import { describe, expect, it } from "vitest";
import { buildInstitutionalCampaignLink, buildInvitationFrom, buildOpenInvitationLink, renderInstitutionalInvitationEmail, renderInvitationEmail } from "./mailer.js";

describe("Amplify Day invitation email", () => {
  it("renders the approved two-stage invitation for Gilson", () => {
    const email = renderInvitationEmail({
      guest_name: "Leonardo Camacho",
      guest_email: "leonardo.camacho@amplify.ia.br",
      code: "AMP-TESTE1",
      personal_message: null,
    }, {
      name: "Gilson Leal",
      role: "CEO",
      company: "Shock Wave Academy",
      base_message: "",
    }, "https://example.com/convite/teste");

    expect(email.subject).toContain("Gilson Leal");
    expect(email.html).toContain("Leonardo, seu convite para o Ampl_IA Day by X-Via está reservado.");
    expect(email.html).toContain("Gilson Leal</strong> convidou você para participar desta conversa.");
    expect(email.html).toContain("Este convite é especialmente para o Palco Amplify.");
    expect(email.html).toContain("IA para gestão pública");
    expect(email.html).toContain("O impacto da adoção de IA na educação");
    expect(email.html.indexOf("Palco Amplify")).toBeLessThan(email.html.indexOf("Palco TEIA"));
    expect(email.html).toContain("Confirme sua presença");
    expect(email.html).toContain("Piso 1 · Acesso 1A · Brasília");
    expect(email.html).not.toContain("AMP-TESTE1");
  });

  it("renders an institutional draft without pretending to know a guest", () => {
    const email = renderInstitutionalInvitationEmail({ company: "Colégio Exemplo" }, {
      name: "Gilson Leal",
      role: "CEO",
      company: "Shock Wave Academy",
    }, "https://amplify.ia.br/amplify-day?utm_source=email");
    expect(email.subject).toBe("Convite para a liderança da sua instituição — Ampl_IA Day by X-Via");
    expect(email.html).toContain("gestores públicos e privados");
    expect(email.html).toContain("Palco Amplify");
    expect(email.html).not.toContain("Palco Amplify · XC Studio");
    expect(email.html).toContain("Confirme sua participação");
    expect(email.html).toContain("Happy Hour · 18h");
    expect(email.html).not.toContain("Colégio Exemplo");
    expect(email.html).not.toContain("Convidada");
    expect(email.html.indexOf("Palco Amplify")).toBeGreaterThan(-1);
  });

  it("adds campaign attribution without exposing recipient data", () => {
    const link = buildInstitutionalCampaignLink("https://amplify.ia.br/amplify-day", "4d93a7f0-acde-4d9c-a365-18181c95bf33");
    expect(link).toContain("utm_campaign=amplify_day_2026_educacao");
    expect(link).toContain("palco=amplify");
    expect(link).toContain("crid=4d93a7f0-acde-4d9c-a365-18181c95bf33");
    expect(link).not.toContain("%40");
  });

  it("builds a reusable open invitation link for Palco TEIA", () => {
    const link = buildOpenInvitationLink("https://amplify.ia.br/amplify-day", "teia");
    const url = new URL(link);
    expect(url.searchParams.get("palco")).toBe("teia");
    expect(url.searchParams.get("utm_source")).toBe("convite_aberto");
    expect(url.searchParams.get("utm_medium")).toBe("link");
    expect(url.searchParams.get("utm_campaign")).toBe("amplify_day_2026");
    expect(url.searchParams.get("utm_content")).toBe("palco_teia");
  });

  it("uses the inviter as the visible sender while preserving the configured mailbox", () => {
    expect(buildInvitationFrom(
      "Binho | Amplify <convites@amplify.ia.br>",
      { name: "Gilson Leal" },
    )).toBe("Gilson Leal | Ampl_IA Day by X-Via <convites@amplify.ia.br>");
  });

  it("puts Palco TEIA first when the invitation targets TEIA", () => {
    const email = renderInvitationEmail({
      guest_name: "Maria Silva",
      target_stage: "teia",
    }, {
      name: "Samuel Souza",
      role: "Convidador",
      company: "Amplify Day",
      base_message: "",
    }, "https://example.com/convite/teia");

    expect(email.html).toContain("Este convite é especialmente para o Palco TEIA.");
    expect(email.html.indexOf("Palco TEIA")).toBeLessThan(email.html.indexOf("Palco Amplify"));
  });
});
