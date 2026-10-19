import { describe, expect, it, vi } from "vitest";

import { createAnaZeroToolState, createAnaZeroTools, isValidHandoffContact } from "./tools";

const reader = {
  listDocuments: vi.fn(async () => []),
  getDocument: vi.fn(async () => undefined),
} as never;

const run = <T,>(tool: { execute?: (...args: never[]) => unknown }, input: unknown) =>
  (tool.execute as (value: unknown, options: unknown) => Promise<T>)(input, {});

function createHandoffTool(userTexts: string[]) {
  const state = createAnaZeroToolState([]);
  return { state, tool: createAnaZeroTools(reader, state, userTexts).request_handoff };
}

describe("request_handoff", () => {
  it("rejeita o nome do canal quando o usuário ainda não informou o contato", async () => {
    const { state, tool } = createHandoffTool(["Pode ser pelo WhatsApp"]);

    await expect(run(tool, {
      summary: "Quer conversar com o time",
      consentQuote: "Pode ser pelo WhatsApp",
      contact: "WhatsApp",
    })).resolves.toEqual({ ok: false, error: "contact_must_be_valid_email_or_phone" });
    expect(state.handoff).toBeUndefined();
  });

  it("aceita um e-mail válido informado literalmente pelo usuário", async () => {
    const { state, tool } = createHandoffTool(["Pode me chamar em leo@exemplo.com"]);

    await expect(run(tool, {
      summary: "Quer conversar com o time",
      consentQuote: "Pode me chamar",
      contact: "leo@exemplo.com",
    })).resolves.toMatchObject({ ok: true, status: "recorded_pending_review" });
    expect(state.handoff?.contact).toBe("leo@exemplo.com");
  });

  it("aceita um telefone plausível com DDD informado literalmente pelo usuário", async () => {
    const { state, tool } = createHandoffTool(["Sim, meu número é (11) 99999-8888"]);

    await expect(run(tool, {
      summary: "Quer conversar com o time",
      consentQuote: "Sim",
      contact: "(11) 99999-8888",
    })).resolves.toMatchObject({ ok: true, status: "recorded_pending_review" });
    expect(state.handoff?.contact).toBe("(11) 99999-8888");
  });

  it("rejeita um contato válido que não foi fornecido pelo usuário", async () => {
    const { state, tool } = createHandoffTool(["Pode ser por WhatsApp"]);

    await expect(run(tool, {
      summary: "Quer conversar com o time",
      consentQuote: "Pode ser por WhatsApp",
      contact: "(11) 99999-8888",
    })).resolves.toEqual({ ok: false, error: "contact_not_provided_by_user" });
    expect(state.handoff).toBeUndefined();
  });

  it("mantém obrigatória uma citação literal de consentimento", async () => {
    const { state, tool } = createHandoffTool(["Meu e-mail é leo@exemplo.com"]);

    await expect(run(tool, {
      summary: "Quer conversar com o time",
      consentQuote: "Autorizo o contato",
      contact: "leo@exemplo.com",
    })).resolves.toEqual({ ok: false, error: "consent_not_found_in_user_messages" });
    expect(state.handoff).toBeUndefined();
  });
});

describe("isValidHandoffContact", () => {
  it("rejeita canais e telefones sem DDD", () => {
    expect(isValidHandoffContact("WhatsApp")).toBe(false);
    expect(isValidHandoffContact("e-mail")).toBe(false);
    expect(isValidHandoffContact("99999-8888")).toBe(false);
  });

  it("rejeita um telefone com DDD inexistente", () => {
    expect(isValidHandoffContact("(10) 99999-8888")).toBe(false);
  });
});
