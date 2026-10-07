import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getPreferredName, validatePersonName } from "./personalization.js";
import { getAmplifyDayStageLabel } from "./stages.js";

export const AMPLIFY_DAY_EVENT_KEY = "amplify-day-2026";
export const AMPLIFY_DAY_EVENT_DATE = "23 de setembro de 2026";
export const AMPLIFY_DAY_EVENT_LOCATION = "Brasília";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACTIVE_STATUSES = new Set(["ready", "copied", "visited"]);

function clean(value) {
  return String(value || "").trim();
}

function cleanSecret(value) {
  return clean(value).replace(/^['"]|['"]$/g, "");
}

function getServerConfig() {
  const url = cleanSecret(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const serviceRoleKey = cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const tokenSecret = cleanSecret(process.env.AMPLIFY_DAY_TOKEN_SECRET);

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server-side não configurado.");
  }

  if (tokenSecret.length < 32) {
    throw new Error("AMPLIFY_DAY_TOKEN_SECRET deve ter pelo menos 32 caracteres.");
  }

  return { url, serviceRoleKey, tokenSecret };
}

let serverClient;

export function getAmplifyDayServerClient() {
  if (!serverClient) {
    const { url, serviceRoleKey } = getServerConfig();
    serverClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serverClient;
}

export function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function parseEmailList(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(/[;,\n]+/);
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

export function buildInvitationCc(invitation, inviter) {
  const guestEmail = normalizeEmail(invitation?.guest_email);
  return parseEmailList([inviter?.email, ...(inviter?.additional_cc_emails || [])])
    .filter((email) => isValidEmail(email) && email !== guestEmail)
    .slice(0, 6);
}

export function sanitizeInvitationInput(input = {}) {
  return {
    guest_name: clean(input.name || input.guest_name),
    guest_email: normalizeEmail(input.email || input.guest_email),
    guest_company: clean(input.company || input.guest_company),
    guest_role: clean(input.role || input.guest_role),
    personal_message: clean(input.personalMessage || input.personal_message) || null,
  };
}

export function validateInvitationInput(input) {
  const guest = sanitizeInvitationInput(input);
  const errors = [];
  const nameError = validatePersonName(guest.guest_name);
  if (nameError) errors.push(nameError);
  if (!isValidEmail(guest.guest_email)) errors.push("Email do convidado é inválido.");
  if (guest.guest_company.length < 2) errors.push("Empresa do convidado é obrigatória.");
  if (guest.guest_company.length > 160) errors.push("Empresa do convidado deve ter no máximo 160 caracteres.");
  if (guest.guest_role.length < 2) errors.push("Cargo do convidado é obrigatório.");
  if (guest.guest_role.length > 160) errors.push("Cargo do convidado deve ter no máximo 160 caracteres.");
  if ((guest.personal_message || "").length > 180) errors.push("A mensagem pessoal da landing page excede 180 caracteres.");
  return { guest, errors };
}

export function createInvitationId() {
  return randomUUID();
}

export function createInvitationCode() {
  const bytes = randomBytes(6);
  let value = "";
  for (let index = 0; index < 6; index += 1) {
    value += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  }
  return `AMP-${value}`;
}

export function signInvitationToken(invitationId) {
  const { tokenSecret } = getServerConfig();
  const signature = createHmac("sha256", tokenSecret)
    .update(`${AMPLIFY_DAY_EVENT_KEY}:${invitationId}`)
    .digest("base64url");
  return `${invitationId}.${signature}`;
}

export function hashInvitationToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyInvitationToken(token) {
  const cleanToken = clean(token);
  const separator = cleanToken.lastIndexOf(".");
  if (separator < 1) return null;

  const invitationId = cleanToken.slice(0, separator);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    return null;
  }

  const expected = signInvitationToken(invitationId);
  const suppliedBuffer = Buffer.from(cleanToken);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(suppliedBuffer, expectedBuffer) ? invitationId : null;
}

export function buildInvitationMaterials(invitation, inviter, origin) {
  const token = signInvitationToken(invitation.id);
  const siteOrigin = clean(origin || process.env.AMPLIFY_DAY_SITE_URL || "https://amplify.ia.br").replace(/\/$/, "");
  const link = `${siteOrigin}/amplify-day/convite/${encodeURIComponent(token)}`;
  const firstName = getPreferredName(invitation.guest_name);
  const personal = clean(invitation.personal_message);
  const introduction = personal || clean(inviter.base_message).replaceAll("{convidado}", firstName);
  const signature = clean(inviter.signature);
  const subject = `${inviter.name} reservou um convite para você — Ampl_IA Day by X-Via`;
  const message = [
    `Olá, ${firstName}.`,
    introduction,
    `${inviter.name}, ${inviter.role} na ${inviter.company}, reservou um convite nominal para você no Ampl_IA Day by X-Via — ${getAmplifyDayStageLabel(invitation.target_stage)}.`,
    `${AMPLIFY_DAY_EVENT_DATE}, em ${AMPLIFY_DAY_EVENT_LOCATION}.`,
    `Confirme sua presença: ${link}`,
    `Código do convite: ${invitation.code}`,
    signature,
  ].filter(Boolean).join("\n\n");

  return { token, link, subject, message };
}

export async function requireAmplifyDayEditor(request) {
  const authorization = request.headers?.get
    ? request.headers.get("authorization")
    : request.headers?.authorization;
  const accessToken = clean(authorization).replace(/^Bearer\s+/i, "");
  if (!accessToken) return { ok: false, status: 401, error: "Sessão ausente." };

  const supabase = getAmplifyDayServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) return { ok: false, status: 401, error: "Sessão inválida." };

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);

  if (roleError) return { ok: false, status: 500, error: "Não foi possível validar a permissão." };
  const allowed = (roles || []).some(({ role }) => role === "admin" || role === "editor");
  if (!allowed) return { ok: false, status: 403, error: "Acesso negado." };
  return { ok: true, user: authData.user, supabase };
}

const INVITATION_SELECT = `
  id, event_key, inviter_id, target_stage, guest_name, guest_email, guest_company, guest_role,
  personal_message, code, token_hash, status, copied_at, first_visited_at,
  last_visited_at, visit_count, confirmed_at, revoked_at, expires_at,
  confirmation_email_status, confirmation_email_error, kit_sync_status,
  kit_sync_error, registration_origin, created_at, updated_at,
  invite_email_status, invite_email_id, invite_email_cc, invite_email_sent_at,
  invite_email_delivered_at, invite_email_error, invite_email_attempt_count,
  invite_email_last_attempt_at,
  inviter:amplify_day_inviters(id, name, email, role, company, signature, base_message, additional_cc_emails)
`;
const LEGACY_INVITATION_SELECT = INVITATION_SELECT.replace("target_stage, ", "");

export async function resolveInvitation(token, { markVisited = false } = {}) {
  const invitationId = verifyInvitationToken(token);
  if (!invitationId) return { ok: false, reason: "invalid" };

  const supabase = getAmplifyDayServerClient();
  let { data, error } = await supabase
    .from("amplify_day_invitations")
    .select(INVITATION_SELECT)
    .eq("id", invitationId)
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle();

  let invitationSelect = INVITATION_SELECT;
  if (error && /target_stage/i.test(String(error.message || ""))) {
    invitationSelect = LEGACY_INVITATION_SELECT;
    ({ data, error } = await supabase
      .from("amplify_day_invitations")
      .select(invitationSelect)
      .eq("id", invitationId)
      .eq("token_hash", hashInvitationToken(token))
      .maybeSingle());
  }

  if (error || !data) return { ok: false, reason: "invalid" };
  data.target_stage ||= "amplify";
  if (data.status === "revoked") return { ok: false, reason: "revoked" };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { ok: false, reason: "expired" };

  if (markVisited && data.status !== "confirmed") {
    const nextStatus = ACTIVE_STATUSES.has(data.status) ? "visited" : data.status;
    const now = new Date().toISOString();
    const { data: visited } = await supabase
      .from("amplify_day_invitations")
      .update({
        status: nextStatus,
        first_visited_at: data.first_visited_at || now,
        last_visited_at: now,
        visit_count: Number(data.visit_count || 0) + 1,
      })
      .eq("id", data.id)
      .select(invitationSelect)
      .single();
    if (visited) return { ok: true, invitation: { ...visited, target_stage: visited.target_stage || "amplify" } };
  }

  return { ok: true, invitation: data };
}
