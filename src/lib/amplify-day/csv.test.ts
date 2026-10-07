import { describe, expect, it } from "vitest";
import { parseInvitationCsv, serializeInvitationPackage } from "./csv";

describe("parseInvitationCsv", () => {
  it("accepts the documented Portuguese columns and quoted commas", () => {
    const rows = parseInvitationCsv([
      "nome,email,empresa,cargo,mensagem_pessoal",
      '"Maria Souza",maria@empresa.com,"Empresa, S.A.",Diretora,"Convite pessoal, Maria"',
    ].join("\n"));

    expect(rows).toEqual([{
      name: "Maria Souza",
      email: "maria@empresa.com",
      company: "Empresa, S.A.",
      role: "Diretora",
      personalMessage: "Convite pessoal, Maria",
    }]);
  });

  it("accepts semicolon-separated spreadsheets", () => {
    const rows = parseInvitationCsv("nome;email;empresa;cargo\nJoão;JOAO@EXEMPLO.COM;Amplify;CEO");
    expect(rows[0].email).toBe("joao@exemplo.com");
  });

  it("rejects missing columns and invalid rows", () => {
    expect(() => parseInvitationCsv("nome,email\nMaria,maria@empresa.com")).toThrow(/colunas/i);
    expect(() => parseInvitationCsv("nome,email,empresa,cargo\nMaria,invalido,Empresa,CEO")).toThrow(/Linha 2/i);
  });
});

describe("serializeInvitationPackage", () => {
  it("escapes fields and includes the share materials", () => {
    const csv = serializeInvitationPackage([{
      guest_name: "Maria Souza",
      guest_email: "maria@empresa.com",
      guest_company: "Empresa, S.A.",
      guest_role: "Diretora",
      code: "AMP-7K2P9Q",
      link: "https://amplify.ia.br/convite/token",
      subject: "Convite",
      message: 'Ela disse "sim"',
      status: "ready",
    }]);
    expect(csv).toContain('"Empresa, S.A."');
    expect(csv).toContain('"Ela disse ""sim"""');
    expect(csv).toContain('"AMP-7K2P9Q"');
  });
});

