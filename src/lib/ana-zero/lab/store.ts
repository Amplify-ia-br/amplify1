import { getServerClient } from "../../ana/store.js";
import type { LabTester } from "./types.js";

export type InviteStatus = "ok" | "not_found" | "revoked" | "expired" | "used";

export type InviteCheck = {
  status: InviteStatus;
  label?: string | null;
  email?: string | null;
  cohort?: string | null;
};

export type SignupInput = {
  code: string;
  name: string;
  email: string;
  profile: string;
  organization?: string;
  tokenHash: string;
  consentVersion: string;
};

export type SignupResult = { status: InviteStatus | "reentry"; testerId?: string };

export type LabStore = {
  checkInvite(code: string): Promise<InviteCheck | undefined>;
  signup(input: SignupInput): Promise<SignupResult | undefined>;
  findTesterByToken(tokenHash: string): Promise<LabTester | null>;
};

function report(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : (error as { message?: string } | null)?.message ?? "erro_desconhecido";
  console.error(`[Ana Lab] Falha em ${action}`, message);
}

export const labStore: LabStore = {
  async checkInvite(code) {
    const supabase = getServerClient();
    if (!supabase) return undefined;
    try {
      const { data, error } = await supabase
        .from("ana_lab_invites")
        .select("label,email,cohort,max_uses,uses,expires_at,revoked_at")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { status: "not_found" };
      if (data.revoked_at) return { status: "revoked" };
      if (new Date(data.expires_at).getTime() <= Date.now()) return { status: "expired" };
      if (data.uses >= data.max_uses) return { status: "used" };
      return { status: "ok", label: data.label, email: data.email, cohort: data.cohort };
    } catch (error) {
      report("consulta de convite", error);
      return undefined;
    }
  },

  async signup(input) {
    const supabase = getServerClient();
    if (!supabase) return undefined;
    try {
      const { data, error } = await supabase.rpc("ana_lab_signup", {
        p_code: input.code,
        p_name: input.name,
        p_email: input.email,
        p_profile: input.profile,
        p_organization: input.organization ?? null,
        p_token_hash: input.tokenHash,
        p_consent_version: input.consentVersion,
      });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { result_status: SignupResult["status"]; result_tester_id: string | null }
        | undefined;
      if (!row) return undefined;
      return { status: row.result_status, testerId: row.result_tester_id ?? undefined };
    } catch (error) {
      report("cadastro de testador", error);
      return undefined;
    }
  },

  async findTesterByToken(tokenHash) {
    const supabase = getServerClient();
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("ana_lab_testers")
        .select("id,name,profile,cohort,revoked_at")
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.revoked_at) return null;
      return { id: data.id, name: data.name, profile: data.profile, cohort: data.cohort };
    } catch (error) {
      report("consulta de testador", error);
      return null;
    }
  },
};
