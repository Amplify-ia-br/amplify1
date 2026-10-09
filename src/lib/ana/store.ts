import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";
import type { AnaConversationState } from "./conversation.js";

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

function describePersistenceError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return "unknown_error";

  const candidate = error as Record<string, unknown>;
  return JSON.stringify({
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : "unknown_error",
    details: typeof candidate.details === "string" ? candidate.details : undefined,
    hint: typeof candidate.hint === "string" ? candidate.hint : undefined,
  });
}

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
  if (!supabase) {
    console.error("[Ana Lab] Persistência não configurada", {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
      hasServerKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY),
    });
    return { persisted: false as const, reason: "not_configured" as const };
  }

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
    console.error("[Ana Lab] Falha ao persistir conversa", describePersistenceError(error));
    return { persisted: false as const, reason: "write_failed" as const };
  }
}

function leadSummary(state: AnaConversationState) {
  const qualification = state.qualification;
  const details = [
    qualification.role && `Papel: ${qualification.role}`,
    qualification.schoolSector && `Rede: ${qualification.schoolSector === "private" ? "particular" : "pública"}`,
    qualification.need && `Necessidade: ${qualification.need}`,
    qualification.gradeFit !== undefined && `Faixa escolar aderente: ${qualification.gradeFit ? "sim" : "não"}`,
    qualification.studentCount !== undefined && `Estudantes: ${qualification.studentCount}`,
    qualification.internetReady !== undefined && `Internet adequada: ${qualification.internetReady ? "sim" : "não"}`,
    qualification.timeline && `Prazo: ${qualification.timeline}`,
  ].filter(Boolean);
  return details.join("\n").slice(0, 5000) || undefined;
}

export async function saveAnaLeadSnapshot(conversationId: string, state: AnaConversationState) {
  if (!state.shouldPersistLead) return { persisted: false as const, reason: "not_a_lead" as const };
  const supabase = getServerClient();
  if (!supabase) return { persisted: false as const, reason: "not_configured" as const };

  try {
    const now = new Date().toISOString();
    const qualification = state.qualification;
    const lead = {
      conversation_id: conversationId,
      ...(qualification.name ? { name: qualification.name } : {}),
      ...(qualification.email ? { email: qualification.email } : {}),
      ...(qualification.phone ? { phone: qualification.phone } : {}),
      ...(qualification.organization ? { company: qualification.organization } : {}),
      ...(qualification.role ? { role: qualification.role } : {}),
      ...(qualification.offerInterest ? { offer_interest: qualification.offerInterest } : {}),
      stage: state.leadStage,
      qualification,
      contact_consent: qualification.contactConsent,
      contact_consent_at: qualification.contactConsent ? now : null,
      ...(state.leadStage === "qualified" ? { qualified_at: now } : {}),
      ...(state.leadStage === "handoff" ? { handoff_requested_at: now } : {}),
      summary: leadSummary(state),
    };

    const { data, error } = await supabase
      .from("ana_leads")
      .upsert(lead, { onConflict: "conversation_id" })
      .select("id, stage")
      .single();
    if (error || !data?.id) throw error || new Error("lead_not_returned");

    const conversationStatus = state.leadStage === "engaged" ? "engaged" : state.leadStage;
    const { error: conversationError } = await supabase
      .from("ana_conversations")
      .update({ status: conversationStatus })
      .eq("id", conversationId);
    if (conversationError) throw conversationError;

    return { persisted: true as const, leadId: data.id as string, stage: data.stage as string };
  } catch (error) {
    console.error("[Ana Lab] Falha ao persistir lead", describePersistenceError(error));
    return { persisted: false as const, reason: "write_failed" as const };
  }
}
