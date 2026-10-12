import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnaKnowledgeMode, AnaModelId } from "./config.js";
import type { AnaConversationState, AnaLeadQualification } from "./conversation.js";
import type { AnaMessage } from "./types.js";

type AnaMessageRole = "user" | "assistant" | "system" | "tool";

type SaveAnaMessageInput = {
  conversationKey: string;
  sessionHash: string;
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

function qualificationFromLead(value: unknown): Partial<AnaLeadQualification> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Partial<AnaLeadQualification>;
}

export async function loadAnaLeadQualification(conversationKey: string, sessionHash: string) {
  const supabase = getServerClient();
  if (!supabase) return undefined;

  try {
    const { data: conversation, error: conversationError } = await supabase
      .from("ana_conversations")
      .select("id")
      .eq("conversation_key", conversationKey)
      .eq("session_hash", sessionHash)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation?.id) return undefined;

    const { data: lead, error: leadError } = await supabase
      .from("ana_leads")
      .select("qualification")
      .eq("conversation_id", conversation.id)
      .maybeSingle();
    if (leadError) throw leadError;
    return qualificationFromLead(lead?.qualification);
  } catch (error) {
    console.error("[Ana Lab] Falha ao carregar memória do lead", describePersistenceError(error));
    return undefined;
  }
}

export async function loadAnaConversationMessages(conversationKey: string, sessionHash: string, limit = 24): Promise<AnaMessage[]> {
  const supabase = getServerClient();
  if (!supabase) return [];

  try {
    const { data: conversation, error: conversationError } = await supabase
      .from("ana_conversations")
      .select("id")
      .eq("conversation_key", conversationKey)
      .eq("session_hash", sessionHash)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation?.id) return [];

    const { data: rows, error: messagesError } = await supabase
      .from("ana_messages")
      .select("id, external_id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 40));
    if (messagesError) throw messagesError;

    let remainingCharacters = 16_000;
    return (rows ?? []).flatMap((row) => {
      if (row.role !== "user" && row.role !== "assistant") return [];
      const content = String(row.content ?? "").trim();
      if (!content || remainingCharacters <= 0) return [];
      const bounded = content.slice(0, remainingCharacters);
      remainingCharacters -= bounded.length;
      return [{
        id: String(row.external_id || `db:${row.id}`),
        role: row.role,
        parts: [{ type: "text" as const, text: bounded }],
      } satisfies AnaMessage];
    }).reverse();
  } catch (error) {
    console.error("[Ana Lab] Falha ao carregar histórico canônico", describePersistenceError(error));
    return [];
  }
}

export async function checkAnaRateLimit(
  identityHash: string,
  maxRequests = 30,
  windowSeconds = 300,
) {
  const supabase = getServerClient();
  if (!supabase) {
    const deployed = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
    return deployed
      ? { configured: false as const, allowed: false as const, reason: "not_configured" as const }
      : { configured: false as const, allowed: true as const };
  }

  try {
    const { data, error } = await supabase.rpc("consume_ana_rate_limit", {
      p_identity_hash: identityHash,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result || typeof result.allowed !== "boolean") throw new Error("rate_limit_result_invalid");
    return {
      configured: true as const,
      allowed: result.allowed as boolean,
      remaining: Number(result.remaining ?? 0),
      resetAt: String(result.reset_at ?? ""),
    };
  } catch (error) {
    console.error("[Ana Lab] Falha ao verificar limite de uso", describePersistenceError(error));
    return { configured: true as const, allowed: false as const, reason: "check_failed" as const };
  }
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
    const { data: claimed, error: conversationError } = await supabase.rpc("claim_ana_conversation", {
      p_conversation_key: input.conversationKey,
      p_session_hash: input.sessionHash,
      p_page_path: input.pagePath ?? null,
    });
    if (conversationError) throw conversationError;
    const conversationId = typeof claimed === "string" ? claimed : undefined;
    if (!conversationId) return { persisted: false as const, reason: "forbidden" as const };

    const { error: messageError } = await supabase
      .from("ana_messages")
      .insert({
        conversation_id: conversationId,
        external_id: input.externalId,
        role: input.role,
        content: input.content,
        model: input.model,
        knowledge_mode: input.knowledgeMode,
        source_ids: input.sourceIds ?? [],
        metadata: input.metadata ?? {},
      });

    if (messageError) throw messageError;
    return { persisted: true as const, conversationId };
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
    qualification.qualificationFocus && `Frente prioritária: ${qualification.qualificationFocus}`,
    qualification.gradeFit !== undefined && `Faixa escolar aderente: ${qualification.gradeFit ? "sim" : "não"}`,
    qualification.studentCount !== undefined && `Estudantes: ${qualification.studentCount}`,
    qualification.internetReady !== undefined && `Internet adequada: ${qualification.internetReady ? "sim" : "não"}`,
    qualification.businessChallenge && `Desafio operacional: ${qualification.businessChallenge}`,
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
      .upsert(lead, { onConflict: "conversation_id", defaultToNull: false })
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
