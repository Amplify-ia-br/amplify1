import { createHmac, timingSafeEqual } from "node:crypto";

const PRODUCT_SLUG = "profissional_nexialista";

function getSecret() {
  return process.env.NEXIALISTA_ACCESS_SECRET || process.env.STRIPE_SECRET_KEY || "";
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  const secret = getSecret();
  if (!secret) throw new Error("NEXIALISTA_ACCESS_SECRET não configurado.");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAccessToken({ email, tier = "free", source = "diagnostico", ttlSeconds = 60 * 60 * 24 * 7 }) {
  const payload = {
    product: PRODUCT_SLUG,
    email: String(email || "").trim().toLowerCase(),
    tier,
    source,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAccessToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.product !== PRODUCT_SLUG) return null;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export async function verifyStripeSession(sessionId) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey || !sessionId) return null;

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
    },
  });

  if (!response.ok) return null;

  const session = await response.json();
  if (session.metadata?.produto !== PRODUCT_SLUG) return null;
  if (session.payment_status !== "paid") return null;

  return session;
}
