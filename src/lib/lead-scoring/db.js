import { neon } from "@neondatabase/serverless";

let sqlClient = null;

function cleanSecret(value) {
  return String(value || "").replace(/^['"]|['"]$/g, "").trim();
}

export function hasDatabaseUrl() {
  return Boolean(cleanSecret(process.env.DATABASE_URL));
}

export function getSql() {
  const databaseUrl = cleanSecret(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurado.");
  }

  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}
