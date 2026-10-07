import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildInvitationCc,
  buildInvitationMaterials,
  createInvitationCode,
  hashInvitationToken,
  signInvitationToken,
  validateInvitationInput,
  verifyInvitationToken,
} from "./invitations.js";
import { renderConfirmationEmail, renderInvitationEmail, sendAmplifyDayInvitation } from "./mailer.js";

beforeAll(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.AMPLIFY_DAY_TOKEN_SECRET = "test-secret-with-at-least-thirty-two-characters";
});

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.RESEND_API_KEY = "re_test";
  process.env.AMPLIFY_DAY_EMAIL_FROM = "Binho | Amplify <convites@amplify.ia.br>";
  process.env.AMPLIFY_DAY_EMAIL_REPLY_TO = "binho@amplify.ia.br";
});

describe("invitation identity", () => {
  it("creates non-sequential codes in the expected alphabet", () => {
    const codes = new Set(Array.from({ length: 100 }, () => createInvitationCode()));
    expect(codes.size).toBe(100);
    for (const code of codes) expect(code).toMatch(/^AMP-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("accepts only an untampered signed token", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    const token = signInvitationToken(id);
    expect(verifyInvitationToken(token)).toBe(id);
    expect(verifyInvitationToken(`${token.slice(0, -1)}x`)).toBeNull();
    expect(hashInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("invitation validation and copy", () => {
  it("normalizes email and requires all registration fields", () => {
    const valid = validateInvitationInput({ name: "Maria", email: " MARIA@EMPRESA.COM ", company: "Empresa", role: "CEO" });
    expect(valid.errors).toEqual([]);
    expect(valid.guest.guest_email).toBe("maria@empresa.com");
    expect(validateInvitationInput({ name: "Maria", email: "x", company: "", role: "" }).errors).toHaveLength(3);
  });

  it("rejects generic names and database-overflowing fields", () => {
    expect(validateInvitationInput({ name: "Convidada", email: "maria@empresa.com", company: "Empresa", role: "CEO" }).errors).toContain(
      "Informe o nome real do convidado; valores genéricos não são permitidos.",
    );
    expect(validateInvitationInput({ name: "Maria", email: "maria@empresa.com", company: "x".repeat(161), role: "CEO" }).errors).toContain(
      "Empresa do convidado deve ter no máximo 160 caracteres.",
    );
  });

  it("limits the optional landing-page note to 180 characters", () => {
    const result = validateInvitationInput({
      name: "Maria",
      email: "maria@empresa.com",
      company: "Empresa",
      role: "CEO",
      personalMessage: "x".repeat(181),
    });
    expect(result.errors).toContain("A mensagem pessoal da landing page excede 180 caracteres.");
  });

  it("builds a personal link without putting PII in the URL", () => {
    const invitation = {
      id: "123e4567-e89b-42d3-a456-426614174000",
      guest_name: "Maria Souza",
      guest_email: "maria@empresa.com",
      personal_message: "Quero muito contar com sua presença.",
      code: "AMP-7K2P9Q",
    };
    const inviter = {
      name: "Ricardo Almeida",
      role: "Presidente",
      company: "LID Brasília",
      signature: "Ricardo",
      base_message: "Olá, {convidado}.",
    };
    const result = buildInvitationMaterials(invitation, inviter, "https://amplify.ia.br");
    expect(result.link).not.toContain("Maria");
    expect(result.link).not.toContain("maria%40empresa.com");
    expect(result.message).toContain("Ricardo Almeida");
    expect(result.message).toContain("AMP-7K2P9Q");
  });

  it("puts the inviter and additional people in real CC without duplicating the guest", () => {
    const cc = buildInvitationCc(
      { guest_email: "maria@empresa.com" },
      {
        email: "JOAO@LID.COM.BR",
        additional_cc_emails: ["secretaria@lid.com.br", "joao@lid.com.br", "maria@empresa.com"],
      },
    );
    expect(cc).toEqual(["joao@lid.com.br", "secretaria@lid.com.br"]);
  });

  it("renders and sends the nominal invitation with CC and an idempotency key", async () => {
    const invitation = {
      id: "123e4567-e89b-42d3-a456-426614174000",
      guest_name: "<Maria>",
      guest_email: "maria@empresa.com",
      personal_message: "Recado <pessoal>",
      code: "AMP-7K2P9Q",
    };
    const inviter = {
      name: "Ricardo Almeida",
      role: "Presidente",
      company: "LID Brasília",
      signature: "Ricardo",
      base_message: "Olá, {convidado}.",
    };
    const email = renderInvitationEmail(invitation, inviter, "https://amplify.ia.br/convite/seguro");
    expect(email.html).toContain("&lt;Maria&gt;");
    expect(email.html).not.toContain("Recado <pessoal>");

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
    const result = await sendAmplifyDayInvitation(invitation, inviter, "https://amplify.ia.br/convite/seguro", ["ricardo@lid.com.br"]);
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(request?.body));

    expect(result).toMatchObject({ ok: true, id: "email-1" });
    expect(payload.to).toEqual(["maria@empresa.com"]);
    expect(payload.cc).toEqual(["ricardo@lid.com.br"]);
    expect(new Headers(request?.headers).get("Idempotency-Key")).toBe("amplify-day-invite-123e4567-e89b-42d3-a456-426614174000");
  });

  it("escapes guest-controlled HTML in the confirmation email", () => {
    const email = renderConfirmationEmail({ guest_name: "<script>alert(1)</script>", code: "AMP-7K2P9Q" });
    expect(email.html).not.toContain("<script>alert(1)</script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});
