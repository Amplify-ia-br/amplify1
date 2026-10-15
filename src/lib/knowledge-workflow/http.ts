import { createClient } from "@supabase/supabase-js";
import { buildPublishedOkfFile, publishedOkfPath } from "./publication.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

function env(name: string, fallback?: string) {
  return process.env[name] || fallback;
}

export async function handleKnowledgePublish(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return json({ error: "unauthorized", message: "Faça login novamente." }, 401);

  // The token comes from the browser client, so validate it against the exact
  // same Supabase project before falling back to the server aliases.
  const supabaseUrl = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const supabaseKey = env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) return json({ error: "server_not_configured", message: "Supabase não configurado no servidor." }, 503);

  const client = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData.user) return json({ error: "unauthorized", message: "Sessão inválida." }, 401);

  const payload = await request.json().catch(() => null) as { documentId?: string; revisionId?: string } | null;
  if (!payload?.documentId || !payload.revisionId) return json({ error: "invalid_request", message: "Documento e revisão são obrigatórios." }, 400);

  const [{ data: document, error: documentError }, { data: revision, error: revisionError }] = await Promise.all([
    client.from("knowledge_documents").select("*").eq("id", payload.documentId).single(),
    client.from("knowledge_revisions").select("*").eq("id", payload.revisionId).eq("document_id", payload.documentId).single(),
  ]);
  if (documentError || revisionError || !document || !revision) return json({ error: "not_found", message: "Documento ou revisão não encontrado." }, 404);

  const [{ data: admin }, { data: owner }] = await Promise.all([
    client.from("knowledge_admins").select("user_id").eq("user_id", authData.user.id).maybeSingle(),
    client.from("knowledge_area_members").select("id").eq("area_id", document.area_id).eq("user_id", authData.user.id).eq("role", "owner").maybeSingle(),
  ]);
  if (!admin && !owner) return json({ error: "forbidden", message: "Apenas o dono da área ou administrador da KB pode publicar." }, 403);
  if (revision.status !== "approved") return json({ error: "not_approved", message: "A revisão precisa estar aprovada antes da publicação." }, 409);

  const githubToken = env("GITHUB_OKF_TOKEN");
  const repository = env("GITHUB_OKF_REPOSITORY", "Amplify-ia-br/amplify1")!;
  const branch = env("GITHUB_OKF_BRANCH", "main")!;
  if (!githubToken) return json({ error: "publication_not_configured", message: "Configure GITHUB_OKF_TOKEN no ambiente da Vercel. A aprovação foi preservada." }, 503);

  let fileContent: string;
  let path: string;
  try {
    fileContent = buildPublishedOkfFile(revision.metadata, revision.content_markdown);
    path = publishedOkfPath({ id: revision.metadata.id, visibility: revision.metadata.visibility } as any);
  } catch (error) {
    return json({ error: "invalid_okf", message: error instanceof Error ? error.message : "Metadados inválidos para o OKF." }, 422);
  }

  await client.from("knowledge_revisions").update({ status: "publishing" }).eq("id", revision.id);
  const githubHeaders = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${githubToken}`,
    "x-github-api-version": "2022-11-28",
    "content-type": "application/json",
  };
  const contentsUrl = `https://api.github.com/repos/${repository}/contents/${path}`;
  const currentResponse = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders });
  const current = currentResponse.ok ? await currentResponse.json() as { sha?: string } : null;
  if (!currentResponse.ok && currentResponse.status !== 404) {
    await client.from("knowledge_revisions").update({ status: "approved" }).eq("id", revision.id);
    return json({ error: "github_read_failed", message: "Não foi possível consultar o arquivo atual no GitHub." }, 502);
  }

  const commitResponse = await fetch(contentsUrl, {
    method: "PUT",
    headers: githubHeaders,
    body: JSON.stringify({
      message: `docs(okf): publish ${document.okf_id}`,
      content: Buffer.from(fileContent, "utf8").toString("base64"),
      branch,
      ...(current?.sha ? { sha: current.sha } : {}),
      committer: { name: authData.user.user_metadata?.full_name || authData.user.email || "Amplify Knowledge", email: authData.user.email || "knowledge@amplify.ia.br" },
    }),
  });
  const commitResult = await commitResponse.json().catch(() => ({})) as { commit?: { sha?: string }; message?: string };
  if (!commitResponse.ok || !commitResult.commit?.sha) {
    await client.from("knowledge_revisions").update({ status: "approved" }).eq("id", revision.id);
    return json({ error: "github_publish_failed", message: commitResult.message || "Falha ao publicar no GitHub." }, 502);
  }

  const publishedAt = new Date().toISOString();
  await Promise.all([
    client.from("knowledge_revisions").update({ status: "published", published_at: publishedAt }).eq("id", revision.id),
    client.from("knowledge_documents").update({ status: "active", published_revision_id: revision.id, published_commit_sha: commitResult.commit.sha }).eq("id", document.id),
    client.from("knowledge_audit_events").insert({
      actor_id: authData.user.id, document_id: document.id, revision_id: revision.id, area_id: document.area_id,
      event_type: "revision.published", details: { commit_sha: commitResult.commit.sha, path, branch },
    }),
  ]);

  return json({ ok: true, commitSha: commitResult.commit.sha, path, branch });
}
