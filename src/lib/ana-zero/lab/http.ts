import { z } from "zod-v4";
import { checkAnaRateLimit } from "../../ana/store.js";
import { PRIVATE_HEADERS, sha256 } from "../access.js";
import { authorizeLab, labCookie, newLabToken, type Authorize } from "./access.js";
import { CONSENT_VERSION, LAB_PROFILE_IDS } from "./profiles.js";
import { labStore, type LabStore } from "./store.js";

type RateResult = "ok" | "limited" | "unavailable";

export type LabDeps = {
  store?: LabStore;
  authorize?: Authorize;
  rateLimit?: (key: string, max: number, windowSeconds: number) => Promise<RateResult>;
};

const MAX_REQUEST_BYTES = 4_096;

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,32}$/);

const signupSchema = z.strictObject({
  code: codeSchema,
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email()),
  profile: z.enum(LAB_PROFILE_IDS),
  organization: z.string().trim().max(120).optional(),
  consent: z.literal(true),
});

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...PRIVATE_HEADERS, ...extra } });

async function defaultRateLimit(key: string, max: number, windowSeconds: number): Promise<RateResult> {
  const limit = await checkAnaRateLimit(await sha256(key), max, windowSeconds);
  if (limit.allowed) return "ok";
  const unavailable = "reason" in limit && (limit.reason === "check_failed" || limit.reason === "not_configured");
  return unavailable ? "unavailable" : "limited";
}

const clientIp = (request: Request) =>
  request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "anonymous";

function rateError(result: Exclude<RateResult, "ok">) {
  return result === "unavailable" ? json({ error: "unavailable" }, 503) : json({ error: "rate_limited" }, 429, { "retry-after": "600" });
}

const SIGNUP_ERRORS = {
  not_found: { status: 404, error: "invite_not_found" },
  revoked: { status: 410, error: "invite_revoked" },
  expired: { status: 410, error: "invite_expired" },
  used: { status: 409, error: "invite_used" },
} as const;

export async function handleAnaLab(request: Request, deps: LabDeps = {}) {
  const store = deps.store ?? labStore;
  const authorize = deps.authorize ?? authorizeLab;
  const rateLimit = deps.rateLimit ?? defaultRateLimit;
  const ip = clientIp(request);

  if (request.method === "DELETE") {
    return json({ ok: true }, 200, { "set-cookie": labCookie(request, "", 0) });
  }

  if (request.method === "GET") {
    const params = new URL(request.url).searchParams;

    if (params.has("me")) {
      const identity = await authorize(request);
      if (identity?.kind !== "tester") return json({ error: "no_access" }, 401);
      const { name, profile, cohort } = identity.tester;
      return json({ tester: { name, profile, cohort } });
    }

    const code = codeSchema.safeParse(params.get("invite") ?? "");
    if (!code.success) return json({ status: "not_found" });
    const limited = await rateLimit(`lab-invite:${ip}`, 60, 600);
    if (limited !== "ok") return rateError(limited);
    const invite = await store.checkInvite(code.data);
    if (!invite) return json({ error: "unavailable" }, 503);
    return json(
      invite.status === "ok"
        ? { status: "ok", label: invite.label, email: invite.email }
        : { status: invite.status },
    );
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json({ error: "payload_too_large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  const limited = await rateLimit(`lab-signup:${ip}`, 10, 3_600);
  if (limited !== "ok") return rateError(limited);

  const token = newLabToken();
  const { code, name, email, profile, organization } = parsed.data;
  const result = await store.signup({
    code,
    name,
    email,
    profile,
    organization: organization || undefined,
    tokenHash: await sha256(token),
    consentVersion: CONSENT_VERSION,
  });
  if (!result) return json({ error: "unavailable" }, 503);
  if (result.status !== "ok" && result.status !== "reentry") {
    const failure = SIGNUP_ERRORS[result.status];
    return json({ error: failure.error }, failure.status);
  }
  return json({ ok: true, reentry: result.status === "reentry" }, 200, { "set-cookie": labCookie(request, token) });
}
