import { describe, expect, it, vi } from "vitest";
import {
  assertExpectedCounts,
  buildReminderRecipients,
  countRecipientsByAudience,
  getReminderMedia,
  normalizeBrazilianWhatsapp,
  renderWhatsappReminder,
  sendZapiText,
  sendZapiMediaSequence,
} from "./whatsapp-reminder.js";

describe("Amplify Day WhatsApp reminder", () => {
  it("normalizes Brazilian phone numbers", () => {
    expect(normalizeBrazilianWhatsapp("(61) 9 9925-0794")).toBe("5561999250794");
    expect(normalizeBrazilianWhatsapp("+55 61 99925-0794")).toBe("5561999250794");
    expect(normalizeBrazilianWhatsapp("123")).toBeNull();
  });

  it("renders the stage, entrance reference, support and opt-out", () => {
    const message = renderWhatsappReminder({ id: 1, first_name: "Ellen", fields: { amplify_day_registration_code: "AMP-G23M42" } }, "amplify");
    expect(message).toContain("Palco Amplify");
    expect(message).toContain("CONAT");
    expect(message).toContain("AMP-G23M42");
    expect(message).toContain("Ana");
    expect(message).toContain("Leonardo Camacho");
    expect(message).toContain("Diretor de IA da Amplify");
    expect(message).toContain("SAIR");
    expect(message.toLowerCase()).not.toContain("happy hour");
  });

  it("maps each presencial audience to its post, followed by map and video", () => {
    expect(getReminderMedia("amplify", "https://example.com/")).toEqual({
      stagePost: "https://example.com/amplify-day/whatsapp/palco-amplify.jpeg",
      map: "https://example.com/amplify-day/whatsapp/mapa-entrada.jpeg",
      video: "https://example.com/amplify-day/whatsapp/como-chegar.mp4",
    });
    expect(() => getReminderMedia("streaming")).toThrow(/Não há pacote/);
  });

  it("sends post, map and video through the documented Z-API endpoints", async () => {
    vi.stubEnv("ZAPI_INSTANCE_ID", "instance");
    vi.stubEnv("ZAPI_INSTANCE_TOKEN", "token");
    vi.stubEnv("ZAPI_CLIENT_TOKEN", "client");
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ messageId: "m1" }) });
    const sleepImpl = vi.fn().mockResolvedValue(undefined);
    await sendZapiMediaSequence({ phone: "5561999250794", audience: "teia", message: "Teste", fetchImpl, sleepImpl });
    expect(fetchImpl.mock.calls.map(([url]) => url.split("/").at(-1))).toEqual(["send-image", "send-image", "send-video"]);
    expect(sleepImpl).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
  });

  it("deduplicates phone numbers and skips contacts without a valid phone", () => {
    const base = { fields: { phone_number: "61999250794" }, tag_names: ["amplify-day-2026-palco-amplify"] };
    const result = buildReminderRecipients([
      { ...base, id: 1, first_name: "Ana", email_address: "ana@example.com" },
      { ...base, id: 2, first_name: "Ana 2", email_address: "ana2@example.com" },
      { ...base, id: 3, first_name: "Sem telefone", email_address: "sem@example.com", fields: {} },
    ]);
    expect(result.recipients).toHaveLength(1);
    expect(result.skipped.duplicatePhone).toBe(1);
    expect(result.skipped.noPhone).toBe(1);
  });

  it("blocks a send when audience totals diverge", () => {
    const counts = countRecipientsByAudience([{ audience: "amplify" }]);
    expect(() => assertExpectedCounts(counts, { amplify: 79, teia: 54, streaming: 5 })).toThrow(/Trava de público/);
  });

  it("calls the documented Z-API send-text endpoint", async () => {
    vi.stubEnv("ZAPI_INSTANCE_ID", "instance");
    vi.stubEnv("ZAPI_INSTANCE_TOKEN", "token");
    vi.stubEnv("ZAPI_CLIENT_TOKEN", "client");
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ messageId: "m1", zaapId: "z1" }) });
    await expect(sendZapiText({ phone: "5561999250794", message: "Teste", fetchImpl })).resolves.toMatchObject({ messageId: "m1" });
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/send-text"), expect.objectContaining({ method: "POST" }));
    vi.unstubAllEnvs();
  });
});
