import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bootstrapEmail = (process.env.KNOWLEDGE_BOOTSTRAP_EMAIL || "leonardo.camacho@amplify.ia.br").toLowerCase();

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para sincronizar a governança.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const areaFromDocument = (document) => {
  if (document.area) return document.area;
  if (["leia", "amplify-academy"].includes(document.id)) return "education";
  if (["offers", "portfolio"].includes(document.id)) return "offers";
  if (document.owner === "commercial") return "commercial";
  if (document.owner === "product" || document.owner === "knowledge") return "technology";
  if (document.owner === "brand") return "brand";
  if (document.owner === "operations") return "operations";
  return "company";
};

const parseOkfFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Frontmatter inválido: ${filePath}`);
  return { metadata: parse(match[1]), content: match[2].trim() };
};

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id")
  .ilike("email", bootstrapEmail)
  .single();
if (profileError || !profile) throw new Error(`Administrador não encontrado: ${bootstrapEmail}`);

const { data: areas, error: areasError } = await supabase.from("knowledge_areas").select("id, slug");
if (areasError) throw areasError;
const areaIds = new Map(areas.map((area) => [area.slug, area.id]));

let imported = 0;
let skipped = 0;
for (const visibility of ["public", "internal", "restricted"]) {
  const directory = join(process.cwd(), "okf", visibility);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".md") && file !== "README.md").sort();
  for (const file of files) {
    const { metadata, content } = await parseOkfFile(join(directory, file));
    const { data: existing, error: existingError } = await supabase
      .from("knowledge_documents")
      .select("id, published_revision_id")
      .eq("okf_id", metadata.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (!existing.published_revision_id) {
        const { data: latestRevision, error: latestRevisionError } = await supabase
          .from("knowledge_revisions")
          .select("id")
          .eq("document_id", existing.id)
          .order("revision_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestRevisionError) throw latestRevisionError;
        if (latestRevision) {
          const { error: repairError } = await supabase
            .from("knowledge_documents")
            .update({ published_revision_id: latestRevision.id })
            .eq("id", existing.id);
          if (repairError) throw repairError;
        }
      }
      const { data: auditEvent, error: auditLookupError } = await supabase
        .from("knowledge_audit_events")
        .select("id")
        .eq("document_id", existing.id)
        .eq("event_type", "document.synced_from_okf")
        .limit(1)
        .maybeSingle();
      if (auditLookupError) throw auditLookupError;
      if (!auditEvent) {
        const { error: auditRepairError } = await supabase.from("knowledge_audit_events").insert({
          actor_id: profile.id,
          document_id: existing.id,
          area_id: areaIds.get(areaFromDocument(metadata)),
          event_type: "document.synced_from_okf",
          details: { file: `okf/${visibility}/${file}`, repaired: true },
        });
        if (auditRepairError) throw auditRepairError;
      }
      skipped += 1;
      continue;
    }

    const areaSlug = areaFromDocument(metadata);
    const areaId = areaIds.get(areaSlug);
    if (!areaId) throw new Error(`Área desconhecida para ${metadata.id}: ${areaSlug}`);
    const canonicalMetadata = { ...metadata, area: areaSlug };
    const { data: document, error: documentError } = await supabase
      .from("knowledge_documents")
      .insert({
        okf_id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        area_id: areaId,
        owner_key: metadata.owner,
        reviewer_key: metadata.reviewer || `${areaSlug}-owner`,
        document_type: metadata.type,
        visibility: metadata.visibility,
        status: metadata.status,
        source_of_truth: metadata.source_of_truth,
        tags: metadata.tags || [],
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (documentError) throw documentError;

    const { data: revision, error: revisionError } = await supabase
      .from("knowledge_revisions")
      .insert({
        document_id: document.id,
        revision_number: 1,
        content_markdown: content,
        metadata: canonicalMetadata,
        change_summary: "Sincronização inicial do OKF versionado",
        status: "published",
        author_id: profile.id,
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (revisionError) throw revisionError;

    const { error: updateError } = await supabase
      .from("knowledge_documents")
      .update({ published_revision_id: revision.id })
      .eq("id", document.id);
    if (updateError) throw updateError;

    await supabase.from("knowledge_audit_events").insert({
      actor_id: profile.id,
      document_id: document.id,
      revision_id: revision.id,
      area_id: areaId,
      event_type: "document.synced_from_okf",
      details: { file: `okf/${visibility}/${file}` },
    });
    imported += 1;
  }
}

console.log(`Governança sincronizada: ${imported} importado(s), ${skipped} já existente(s).`);
