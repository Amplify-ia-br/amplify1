import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";

type AnaMessageRole = "user" | "assistant" | "system" | "tool";

type SaveAnaMessageInput = {
  conversationKey: string;
  externalId: string;
  role: AnaMessageRole;
  content: string;
  model?: AnaModelId | string;
  knowledgeMode?: AnaKnowledgeMode;
  sourceIds?: string[];
  pagePath?: string;
  metadata?: Record<string, unknown>;
};

let serverClient: SupabaseClient | undefined;

function cleanSecret(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}
function getServerClient() {
  if (serverClient) return serverClient;

  const url = cleanSecret(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const key = cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
  if (!url || !key) return undefined;

  serverClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serverClient;
}

export async function saveAnaMessage(input: SaveAnaMessageInput) {
  const supabase = getServerClient();
  if (!supabase) return { persisted: false as const, reason: "not_configured" as const };

  try {
    const now = new Date().toISOString();
    const { data: conversation, error: conversationError } = await supabase
      .from("ana_conversations")
      .upsert({
        conversation_key: input.conversationKey,
        channel: "site",
        page_path: input.pagePath,
        last_message_at: now,
      }, { onConflict: "conversation_key" })
      .select("id")
      .single();

    if (conversationError || !conversation?.id) {
      throw conversationError || new Error("conversation_not_returned");
    }

    const { error: messageError } = await supabase
      .from("ana_messages")
      .upsert({
        conversation_id: conversation.id,
        external_id: input.externalId,
        role: input.role,
        content: input.content,
        model: input.model,
        knowledge_mode: input.knowledgeMode,
        source_ids: input.sourceIds ?? [],
        metadata: input.metadata ?? {},
      }, { onConflict: "conversation_id,external_id", ignoreDuplicates: true });

    if (messageError) throw messageError;
    return { persisted: true as const, conversationId: conversation.id as string };
  } catch (error) {
    console.error("[Ana Lab] Falha ao persistir conversa", error instanceof Error ? error.message : "unknown_error");
    return { persisted: false as const, reason: "write_failed" as const };
  }
}
