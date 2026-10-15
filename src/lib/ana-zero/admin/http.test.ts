import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { handleAnaZeroAdmin } from "./http";

const client = {} as SupabaseClient;
const url = "https://example.test/api/ana-zero-admin";

describe("api admin da Ana", () => {
  it("recusa métodos que não sejam GET ou POST", async () => {
    const response = await handleAnaZeroAdmin(new Request(url, { method: "DELETE" }), { client });
    expect(response.status).toBe(405);
  });

  it("repassa a resposta de autenticação sem tocar no banco", async () => {
    const response = await handleAnaZeroAdmin(new Request(url), {
      client,
      authenticate: async () => Response.json({ error: "forbidden" }, { status: 403 }),
    });
    expect(response.status).toBe(403);
  });

  it("recusa ação POST inválida depois de autenticar", async () => {
    const response = await handleAnaZeroAdmin(
      new Request(url, { method: "POST", body: JSON.stringify({ action: "apagar" }) }),
      { client, authenticate: async () => ({ userId: "u1", email: "a@b.c" }) },
    );
    expect(response.status).toBe(400);
  });
});
