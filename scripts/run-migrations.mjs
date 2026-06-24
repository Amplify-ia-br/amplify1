// Aplica as migrations SQL (migrations/*.sql) no Postgres apontado por DATABASE_URL.
// Idempotente (as migrations usam IF NOT EXISTS). Uso:
//   DATABASE_URL=postgresql://... node scripts/run-migrations.mjs
// Em dev, a DATABASE_URL pode vir do .env (carregada manualmente abaixo).
import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.DATABASE_URL && existsSync(join(root, ".env"))) {
  const env = await readFile(join(root, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
    if (m) process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente (defina no ambiente ou no .env).");
  process.exit(1);
}

const sql = neon(url);
const dir = join(root, "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const raw = await readFile(join(dir, file), "utf8");
  const cleaned = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = cleaned
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`\n== ${file}: ${statements.length} statements ==`);
  for (const stmt of statements) {
    await sql.query(stmt);
    console.log("  ok:", stmt.split("\n")[0].slice(0, 72));
  }
}

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name`;
console.log("\nTabelas em public:", tables.map((t) => t.table_name).join(", "));
console.log("Migrations aplicadas com sucesso.");
