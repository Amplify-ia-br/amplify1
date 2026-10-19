import { hasValidTestToken, sha256 } from "../access.js";
import { readServerEnv } from "../env.js";
import { labStore } from "./store.js";
import type { LabTester } from "./types.js";

export const LAB_COOKIE = "ana_lab_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

export type LabIdentity = { kind: "tester"; tester: LabTester } | { kind: "token" };
export type Authorize = (request: Request) => Promise<LabIdentity | null>;

export function newLabToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readLabCookie(request: Request) {
  return request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${LAB_COOKIE}=([a-f0-9]{64})`))?.[1];
}

export function labCookie(request: Request, token: string, maxAge = COOKIE_MAX_AGE) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${LAB_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function createAuthorize(findTester: (tokenHash: string) => Promise<LabTester | null>): Authorize {
  return async (request) => {
    const cookie = readLabCookie(request);
    if (cookie) {
      const tester = await findTester(await sha256(cookie));
      if (tester) return { kind: "tester", tester };
    }
    const deployed = Boolean(readServerEnv("VERCEL_ENV"));
    if (!readServerEnv("ANA_TEST_TOKEN")) return deployed ? null : { kind: "token" };
    return (await hasValidTestToken(request)) ? { kind: "token" } : null;
  };
}

export const authorizeLab: Authorize = createAuthorize((hash) => labStore.findTesterByToken(hash));
