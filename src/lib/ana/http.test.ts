import { describe, expect, it, vi } from "vitest";
import type { KnowledgeReader } from "../okf/http";

const mocks = vi.hoisted(() => ({ saveAnaMessage: vi.fn().mockResolvedValue({ persisted: true }) }));

vi.mock("./store.js", () => ({ saveAnaMessage: mocks.saveAnaMessage }));

import { handleAnaChat } from "./http";

const reader = {
  listKnowledge: vi.fn(() => { throw new Error("greeting_must_not_retrieve"); }),
  searchKnowledge: vi.fn(() => { throw new Error("greeting_must_not_retrieve"); }),
  getKnowledgeById: vi.fn(() => { throw new Error("greeting_must_not_retrieve"); }),
} as unknown as KnowledgeReader;

describe("Ana conversational HTTP flow", () => {
  it("answers greetings immediately without retrieving or pitching", async () => {
    mocks.saveAnaMessage.mockClear();
    const response = await handleAnaChat(new Request("https://amplify.ia.br/api/ana-chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId: "77777777-7777-4777-8777-777777777777",
        pagePath: "/lab/ana",
        mode: "mcp",
        messages: [{ id: "hello-1", role: "user", parts: [{ type: "text", text: "Olá" }] }],
      }),
    }), reader);

    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain("Oi! Tudo bem? Como posso te ajudar?");
    expect(body).not.toContain("A Amplify ajuda pessoas");
    expect(reader.listKnowledge).not.toHaveBeenCalled();
    expect(reader.getKnowledgeById).not.toHaveBeenCalled();
    expect(mocks.saveAnaMessage).toHaveBeenCalledTimes(2);
  });
});
