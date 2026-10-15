import { supabase } from "@/integrations/supabase/client";
import type {
  buildSessionDetail,
  computeByPromptVersion,
  computeContent,
  computeOverview,
  filterOptions,
  summarizeSessions,
} from "@/lib/ana-zero/admin/metrics";
import type { InviteRow, TesterRow } from "@/lib/ana-zero/lab/types";
import type { AnalysisRunRow, Filters, RecommendationRow, RecommendationStatus } from "@/lib/ana-zero/admin/types";

export type OverviewResponse = {
  promptVersion: string;
  options: ReturnType<typeof filterOptions>;
  overview: ReturnType<typeof computeOverview>;
  pendingAnalysis: number;
};
export type SessionsResponse = { sessions: ReturnType<typeof summarizeSessions> };
export type SessionDetailResponse = NonNullable<ReturnType<typeof buildSessionDetail>>;
export type ContentResponse = { content: ReturnType<typeof computeContent> };
export type EvolutionResponse = { versions: ReturnType<typeof computeByPromptVersion>; currentVersion: string };
export type RecommendationsResponse = { recommendations: RecommendationRow[]; runs: AnalysisRunRow[] };
export type InvitesResponse = { invites: InviteRow[]; testers: TesterRow[] };

const ENDPOINT = "/api/ana-zero-admin";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `http_${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function adminGet<T>(view: string, filters: Filters = {}, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ view, ...extra });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return parse<T>(await fetch(`${ENDPOINT}?${params}`, { headers: await authHeaders() }));
}

export async function adminPost<T>(body: unknown) {
  return parse<T>(
    await fetch(ENDPOINT, {
      method: "POST",
      headers: { ...(await authHeaders()), "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

export type DecideInput = { id: string; status: RecommendationStatus; note?: string; implementedCommit?: string };

export const errorMessage = (error: unknown) => {
  const code = error instanceof Error ? error.message : "";
  if (code === "forbidden") return "Seu usuário não tem permissão de admin.";
  if (code === "unauthorized") return "Sessão expirada. Entre novamente.";
  if (code === "storage_unavailable") return "Banco de dados indisponível.";
  if (code === "lab_not_migrated") return "Aplique a migração 20261015170000_add_ana_lab_invites.sql no Supabase para usar os convites.";
  return "Não foi possível concluir. Tente novamente.";
};

export const pct = (value: number | null | undefined) => (value == null ? "—" : `${Math.round(value * 100)}%`);
export const usd = (value: number | null | undefined, digits = 2) => (value == null ? "—" : `US$ ${value.toFixed(digits)}`);
export const ms = (value: number | null | undefined) => (value == null ? "—" : `${(value / 1000).toFixed(1)} s`);
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export const REASON_LABELS: Record<string, string> = {
  robotica: "Robótica",
  repetitiva: "Repetitiva",
  errou_fato: "Errou fato",
  pergunta_desnecessaria: "Pergunta desnecessária",
  travou: "Travou",
  tom: "Tom",
};
