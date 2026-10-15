import type { SupabaseClient } from "@supabase/supabase-js";
import type { InviteRow, TesterRow } from "./types.js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_COLUMNS = "id,code,label,email,cohort,max_uses,uses,daily_limit,expires_at,revoked_at,created_at";
const TESTER_COLUMNS = "id,invite_id,name,email,profile,organization,cohort,consent_at,revoked_at,created_at";

export const LAB_NOT_MIGRATED = "lab_not_migrated";

export function generateInviteCode(length = 10) {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

function failOnMissingTable(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "PGRST205" || error.code === "42P01" || error.code === "42703" || error.code === "PGRST204") throw new Error(LAB_NOT_MIGRATED);
  throw error;
}

export async function loadInvites(client: SupabaseClient) {
  const [invites, testers, sessions, settings] = await Promise.all([
    client.from("ana_lab_invites").select(INVITE_COLUMNS).order("created_at", { ascending: false }).limit(500),
    client.from("ana_lab_testers").select(TESTER_COLUMNS).order("created_at", { ascending: false }).limit(1000),
    client.from("ana_test_sessions").select("tester_id").not("tester_id", "is", null).limit(10_000),
    client.from("ana_lab_settings").select("paused").eq("id", true).maybeSingle(),
  ]);
  failOnMissingTable(invites.error);
  failOnMissingTable(testers.error);
  failOnMissingTable(sessions.error);
  failOnMissingTable(settings.error);

  const counts = new Map<string, number>();
  for (const row of (sessions.data ?? []) as Array<{ tester_id: string }>) {
    counts.set(row.tester_id, (counts.get(row.tester_id) ?? 0) + 1);
  }
  return {
    paused: Boolean(settings.data?.paused),
    invites: (invites.data ?? []) as unknown as InviteRow[],
    testers: ((testers.data ?? []) as unknown as Omit<TesterRow, "sessions">[]).map((tester) => ({
      ...tester,
      sessions: counts.get(tester.id) ?? 0,
    })),
  };
}

export type CreateInviteInput = {
  label: string;
  email?: string;
  cohort?: string;
  maxUses: number;
  dailyLimit: number;
  expiresInDays: number;
};

export async function createInvite(client: SupabaseClient, input: CreateInviteInput, userId: string) {
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await client
      .from("ana_lab_invites")
      .insert({
        code: generateInviteCode(),
        label: input.label,
        email: input.email || null,
        cohort: input.cohort || null,
        max_uses: input.maxUses,
        daily_limit: input.dailyLimit,
        expires_at: expiresAt,
        created_by: userId,
      })
      .select(INVITE_COLUMNS)
      .single();
    if (!error) return data as unknown as InviteRow;
    if (error.code !== "23505") failOnMissingTable(error);
  }
  return undefined;
}

export async function revokeInvite(client: SupabaseClient, id: string) {
  const now = new Date().toISOString();
  const invite = await client.from("ana_lab_invites").update({ revoked_at: now }).eq("id", id).select("id").maybeSingle();
  if (invite.error || !invite.data) return false;
  const testers = await client.from("ana_lab_testers").update({ revoked_at: now }).eq("invite_id", id).is("revoked_at", null);
  return !testers.error;
}

export async function setLabPaused(client: SupabaseClient, paused: boolean, userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("ana_lab_settings")
    .upsert({ id: true, paused, paused_at: paused ? now : null, updated_by: userId, updated_at: now })
    .select("paused")
    .single();
  failOnMissingTable(error);
  return Boolean(data?.paused) === paused;
}

export async function revokeTester(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from("ana_lab_testers")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  return !error && Boolean(data);
}
