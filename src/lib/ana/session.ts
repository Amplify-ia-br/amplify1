const COOKIE_NAME = "ana_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function cleanSecret(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, "");
}

function isDeployed() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
}

function sessionSecret() {
  const configured = cleanSecret(process.env.ANA_SESSION_SECRET)
    || cleanSecret(process.env.SUPABASE_SERVICE_ROLE_KEY)
    || cleanSecret(process.env.SUPABASE_SECRET_KEY);
  if (configured) return `ana-session-v1:${configured}`;
  return isDeployed() ? undefined : "ana-session-v1:local-development-only";
}

function bytesToHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function sha256(value: string) {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const item of cookies.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(parts.join("="));
  }
  return undefined;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function serializeCookie(value: string, request: Request) {
  const secure = isDeployed() || new URL(request.url).protocol === "https:";
  return [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/api/ana-chat",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export type AnaSession = {
  sessionHash: string;
  setCookie?: string;
};

export async function resolveAnaSession(request: Request): Promise<AnaSession | undefined> {
  const secret = sessionSecret();
  if (!secret) return undefined;

  const existing = cookieValue(request);
  if (existing) {
    const [sessionId, issuedAtRaw, signature, ...extra] = existing.split(".");
    const issuedAt = Number(issuedAtRaw);
    const now = Math.floor(Date.now() / 1000);
    const timestampIsValid = Number.isInteger(issuedAt)
      && issuedAt <= now + 60
      && issuedAt >= now - SESSION_MAX_AGE_SECONDS;
    if (!extra.length && timestampIsValid && /^[0-9a-f-]{36}$/i.test(sessionId ?? "") && /^[0-9a-f]{64}$/i.test(signature ?? "")) {
      const expected = await hmac(`${sessionId}.${issuedAt}`, secret);
      if (timingSafeEqual(signature, expected)) {
        return { sessionHash: await sha256(`ana-session:${sessionId}`) };
      }
    }
  }

  const sessionId = crypto.randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const signedValue = `${sessionId}.${issuedAt}`;
  const signature = await hmac(signedValue, secret);
  return {
    sessionHash: await sha256(`ana-session:${sessionId}`),
    setCookie: serializeCookie(`${signedValue}.${signature}`, request),
  };
}
