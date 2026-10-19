import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readServerEnv } from "../env.js";

let cached: SupabaseClient | undefined;

export function getAdminClient() {
  if (cached) return cached;
  const clean = (value?: string) => value?.trim().replace(/^['"]|['"]$/g, "");
  const url = clean(readServerEnv("SUPABASE_URL") ?? readServerEnv("VITE_SUPABASE_URL"));
  const key = clean(readServerEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readServerEnv("SUPABASE_SECRET_KEY"));
  if (!url || !key) return undefined;
  cached = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}

export type AdminIdentity = { userId: string; email?: string };

export async function requireAdmin(
  request: Request,
  client: SupabaseClient | undefined = getAdminClient(),
): Promise<AdminIdentity | Response> {
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  if (!client) return Response.json({ error: "storage_unavailable" }, { status: 503, headers });

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401, headers });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "unauthorized" }, { status: 401, headers });

  const role = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (role.error || !role.data) return Response.json({ error: "forbidden" }, { status: 403, headers });

  return { userId: data.user.id, email: data.user.email ?? undefined };
}
