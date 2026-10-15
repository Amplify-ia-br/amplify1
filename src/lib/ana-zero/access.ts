import { readServerEnv } from "./env.js";

export const TEST_TOKEN_HEADER = "x-ana-test-token";

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ana-zero:${value}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Sem ANA_TEST_TOKEN configurado o acesso fica aberto (apenas com limites de uso).
export async function hasValidTestToken(request: Request) {
  const expected = readServerEnv("ANA_TEST_TOKEN");
  if (!expected) return true;
  const provided = request.headers.get(TEST_TOKEN_HEADER) ?? "";
  const [expectedHash, providedHash] = await Promise.all([sha256(expected), sha256(provided)]);
  return expectedHash === providedHash;
}

export const PRIVATE_HEADERS = {
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, nosnippet",
};
