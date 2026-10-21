import { describe, expect, it, vi } from "vitest";
import {
  createAnaSpeakHandler,
  createFixedWindowRateLimiter,
  sanitizeSpeechMessages,
} from "../../../api/ana-speak.js";

function speechRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.test/api/ana-speak", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function allowRequest() {
  return { allowed: true, remaining: 19, retryAfterSeconds: 60 };
}

describe("POST /api/ana-speak", () => {
  it("redacts personal contact data before invoking the text provider", async () => {
    const generateText = vi.fn().mockResolvedValue("Pode continuar. Qual é o próximo passo?");
    const generateSpeech = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const handler = createAnaSpeakHandler({
      generateText,
      generateSpeech,
      consumeRateLimit: allowRequest,
      env: {},
    });

    const response = await handler(
      speechRequest({
        messages: [
          { role: "user", field: "email", content: "Meu e-mail é marina@example.com" },
          { role: "user", field: "need", content: "Pode falar comigo no +55 (61) 99999-9999" },
        ],
        currentQuestion: "Qual é o seu objetivo?",
      }),
    );

    expect(response.status).toBe(200);
    expect(generateText).toHaveBeenCalledWith(
      [
        { role: "user", content: "Dado pessoal informado e omitido por privacidade." },
        { role: "user", content: "Pode falar comigo no [telefone omitido]" },
      ],
      "Qual é o seu objetivo?",
    );
    expect(JSON.stringify(generateText.mock.calls)).not.toContain("marina@example.com");
    expect(JSON.stringify(generateText.mock.calls)).not.toContain("99999-9999");
  });

  it("limits repeated voice generation requests before external providers are called", async () => {
    let now = 1_000;
    const limiter = createFixedWindowRateLimiter({ now: () => now });
    const generateText = vi.fn().mockResolvedValue("Pergunta segura");
    const handler = createAnaSpeakHandler({
      generateText,
      generateSpeech: vi.fn().mockResolvedValue(new ArrayBuffer(1)),
      consumeRateLimit: limiter,
      env: {
        ANA_SPEECH_RATE_LIMIT_MAX: "2",
        ANA_SPEECH_RATE_LIMIT_WINDOW_MS: "1000",
      },
    });

    expect((await handler(speechRequest({ currentQuestion: "Pergunta 1" }))).status).toBe(200);
    expect((await handler(speechRequest({ currentQuestion: "Pergunta 2" }))).status).toBe(200);
    const limited = await handler(speechRequest({ currentQuestion: "Pergunta 3" }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("1");
    expect(generateText).toHaveBeenCalledTimes(2);

    now = 2_001;
    expect((await handler(speechRequest({ currentQuestion: "Pergunta 4" }))).status).toBe(200);
  });

  it("rejects cross-origin browser calls and oversized request bodies", async () => {
    const generateText = vi.fn();
    const handler = createAnaSpeakHandler({
      generateText,
      generateSpeech: vi.fn(),
      consumeRateLimit: allowRequest,
      env: {},
    });

    const crossOrigin = await handler(
      speechRequest({ currentQuestion: "Pergunta" }, { Origin: "https://attacker.example" }),
    );
    expect(crossOrigin.status).toBe(403);

    const oversized = await handler(
      speechRequest({ currentQuestion: "Pergunta", messages: [{ content: "a".repeat(25_000) }] }),
    );
    expect(oversized.status).toBe(413);
    expect(generateText).not.toHaveBeenCalled();
  });
});

describe("sanitizeSpeechMessages", () => {
  it("caps history and removes email and phone patterns even without field metadata", () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "user",
      content: index === 17 ? "ana@example.com / (11) 98888-7777" : `resposta ${index}`,
    }));

    const sanitized = sanitizeSpeechMessages(messages);
    expect(sanitized).toHaveLength(16);
    expect(sanitized.at(-1)?.content).toBe("[e-mail omitido] / [telefone omitido]");
  });
});
