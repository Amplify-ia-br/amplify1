import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "@sanity/client";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function toDocumentIdFromSlug(slug) {
  const safe = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `post.${safe}`;
}

async function fetchCoverAsBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image ${url}: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const arr = await res.arrayBuffer();
  return { buffer: Buffer.from(arr), contentType };
}

async function main() {
  const root = process.cwd();
  loadEnvFile(path.join(root, ".env"));

  const apply = process.argv.includes("--apply");
  if (!apply) {
    console.log("Dry-run mode. Use --apply to perform writes.");
  }

  const supabaseUrl = requireEnv("VITE_SUPABASE_URL");
  const supabaseAnon = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  const sanityProjectId = requireEnv("PUBLIC_SANITY_PROJECT_ID");
  const sanityDataset = requireEnv("PUBLIC_SANITY_DATASET");
  const sanityToken = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN || "";
  const sanityApiVersion = process.env.PUBLIC_SANITY_API_VERSION || "2025-01-01";

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnon);
  if (apply && !sanityToken) {
    throw new Error("Missing required env var: SANITY_API_WRITE_TOKEN (or SANITY_AUTH_TOKEN)");
  }

  const sanity = createSanityClient({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    apiVersion: sanityApiVersion,
    token: sanityToken || undefined,
    useCdn: false,
    perspective: "published",
  });

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select(
      "id, title, slug, excerpt, cover_image_url, category, read_time, author_name, content, published, published_at, created_at, updated_at",
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!posts || posts.length === 0) {
    console.log("No posts found in Supabase.");
    return;
  }

  console.log(`Found ${posts.length} posts in Supabase.`);
  const assetRefCache = new Map();
  let migrated = 0;
  let skipped = 0;

  for (const post of posts) {
    if (!post.slug || !post.title || !post.content) {
      skipped += 1;
      console.log(`Skipping invalid post id=${post.id}`);
      continue;
    }

    const existing = sanityToken
      ? await sanity.fetch(`*[_type == "post" && slug.current == $slug][0]{_id}`, { slug: post.slug })
      : null;
    const targetId = existing?._id || toDocumentIdFromSlug(post.slug);

    let coverImage = undefined;
    if (post.cover_image_url) {
      if (assetRefCache.has(post.cover_image_url)) {
        coverImage = { _type: "image", asset: { _type: "reference", _ref: assetRefCache.get(post.cover_image_url) } };
      } else if (apply) {
        try {
          const { buffer, contentType } = await fetchCoverAsBuffer(post.cover_image_url);
          const uploaded = await sanity.assets.upload("image", buffer, {
            contentType,
            filename: `${post.slug}.jpg`,
          });
          assetRefCache.set(post.cover_image_url, uploaded._id);
          coverImage = { _type: "image", asset: { _type: "reference", _ref: uploaded._id } };
        } catch (uploadErr) {
          console.warn(`Image upload failed for ${post.slug}: ${uploadErr.message}`);
        }
      }
    }

    const doc = {
      _id: targetId,
      _type: "post",
      title: post.title,
      slug: { _type: "slug", current: post.slug },
      published: Boolean(post.published),
      publishedAt: post.published_at || post.created_at || new Date().toISOString(),
      excerpt: post.excerpt || "",
      category: post.category || "",
      readTime: post.read_time || "",
      authorName: post.author_name || "",
      contentHtml: post.content,
      ...(coverImage ? { coverImage } : {}),
    };

    if (apply) {
      await sanity.createOrReplace(doc);
      console.log(`Migrated: ${post.slug}`);
    } else {
      console.log(`Would migrate: ${post.slug}`);
    }
    migrated += 1;
  }

  console.log(`Done. Migrated=${migrated}, Skipped=${skipped}, Mode=${apply ? "apply" : "dry-run"}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
