import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { createKnowledgeService, type KnowledgeSourceEntry } from "./core.js";

const PUBLIC_OKF_ROOT = resolve(process.cwd(), "okf/public");

async function markdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    }),
  );

  return nested.flat().sort();
}

function parseMarkdown(source: string, filePath: string): KnowledgeSourceEntry {
  const normalized = source.replace(/^\uFEFF/, "");
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new Error(`${filePath}: frontmatter YAML ausente ou sem delimitadores válidos.`);
  }

  try {
    return {
      data: parse(match[1]),
      body: normalized.slice(match[0].length),
      filePath,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${filePath}: YAML inválido: ${message}`);
  }
}

async function loadPublicMarkdownEntries() {
  const files = await markdownFiles(PUBLIC_OKF_ROOT);
  return Promise.all(
    files.map(async (filePath) => parseMarkdown(await readFile(filePath, "utf8"), filePath)),
  );
}

/** Runtime reader for Vercel Functions. Its root is deliberately fixed to okf/public. */
export const fileKnowledgeService = createKnowledgeService(loadPublicMarkdownEntries);
