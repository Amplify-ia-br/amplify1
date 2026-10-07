import { describe, expect, it } from "vitest";
import { classifyGilsonCampaignCsv } from "./campaign.js";

describe("Amplify Day campaign classification", () => {
  it("routes shared addresses through the generic institutional flow", () => {
    const csv = [
      ",,,,,,,,",
      "Prospecção,,,,,,,,",
      ",,,,,,,,",
      ",,,,,,,,",
      "ID,Tipo de registro,Nome do convidado,Cargo / alvo,Escola / instituição,E-mail publicado,Tipo de e-mail,Prioridade",
      "L001,Pessoa identificada,Dra. Maria Souza,Diretora,Escola A,maria@escola.com,Profissional nominal publicado,A",
      "L002,Canal institucional,,Direção,Escola B,contato@escolab.com,Institucional — solicitar encaminhamento,B",
      "L003,Pessoa identificada,João Silva,Diretor,Escola C,secretaria@escolac.com,Institucional de secretaria,A",
      "L004,Canal institucional,,Direção,Escola D,,Institucional geral,B",
    ].join("\n");
    const result = classifyGilsonCampaignCsv(csv);
    expect(result.counts).toEqual({ nominal: 1, institutional: 2, blocked: 0, missingEmail: 1, ready: 3 });
    expect(result.recipients.find((item) => item.type === "nominal")?.name).toBe("Dra. Maria Souza");
    const shared = result.recipients.find((item) => item.email === "secretaria@escolac.com");
    expect(shared).toMatchObject({ type: "institutional", status: "ready", name: null });
  });
});
