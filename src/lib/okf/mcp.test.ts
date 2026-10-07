import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";
import { createKnowledgeMcpServer } from "@/lib/okf/mcp-server";
import { createTestKnowledgeService } from "@/lib/okf/test-fixtures";

const connections: Array<{ client: Client; server: ReturnType<typeof createKnowledgeMcpServer> }> = [];

async function connectedClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createKnowledgeMcpServer(createTestKnowledgeService());
  const client = new Client({ name: "okf-test", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  connections.push({ client, server });
  return client;
}

afterEach(async () => {
  await Promise.all(connections.splice(0).map(async ({ client, server }) => {
    await client.close();
    await server.close();
  }));
});

describe("OKF MCP tools", () => {
  it("exposes exactly the three read-only knowledge tools", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();

    expect(tools.map(({ name }) => name).sort()).toEqual([
      "get_knowledge",
      "list_knowledge",
      "search_knowledge",
    ]);
  });

  it("lists only public published metadata", async () => {
    const client = await connectedClient();
    const result = await client.callTool({ name: "list_knowledge", arguments: {} });
    const items = (result.structuredContent as { items: Array<{ id: string }> }).items;

    expect(items.map(({ id }) => id)).toEqual(["company", "amplify-academy"]);
    expect(items.some(({ id }) => id === "offers" || id === "commercial-policy")).toBe(false);
  });

  it("searches public knowledge", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search_knowledge",
      arguments: { query: "EDUCACAO", limit: 5 },
    });
    const results = (result.structuredContent as { results: Array<{ id: string }> }).results;

    expect(results.map(({ id }) => id)).toEqual(["amplify-academy"]);
  });

  it("gets a full public item and rejects private ids", async () => {
    const client = await connectedClient();
    const publicResult = await client.callTool({ name: "get_knowledge", arguments: { id: "company" } });
    const privateResult = await client.callTool({
      name: "get_knowledge",
      arguments: { id: "../internal/commercial-policy" },
    });

    expect((publicResult.structuredContent as { document: { content: string } }).document.content).toContain("Amplify ajuda");
    expect(privateResult.isError).toBe(true);
    expect(privateResult.structuredContent).toEqual({ error: "knowledge_not_found" });
  });

  it("does not return internal content in MCP search", async () => {
    const client = await connectedClient();
    const result = await client.callTool({
      name: "search_knowledge",
      arguments: { query: "Preço só pode ser informado quando houver uma referência vigente e aprovada" },
    });

    expect(result.structuredContent).toEqual({ results: [] });
  });
});
