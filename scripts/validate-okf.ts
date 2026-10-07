import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { parse } from "yaml";
import { OKF_SCHEMA_VERSION, okfSchema, type OkfDocument } from "../src/lib/okf-schema.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const okfRoot = resolve(projectRoot, "okf");

type ParsedDocument = {
  file: string;
  data: OkfDocument;
};

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

function readFrontmatter(source: string, file: string): unknown {
  const normalized = source.replace(/^\uFEFF/, "");
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new Error(`${file}: frontmatter YAML ausente ou sem delimitadores válidos.`);
  }

  try {
    return parse(match[1]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${file}: YAML inválido: ${message}`);
  }
}

function expectedVisibility(file: string) {
  const relativePath = relative(okfRoot, file);
  const [folder] = relativePath.split(sep);
  if (folder === "public" || folder === "internal" || folder === "restricted") return folder;
  return undefined;
}

function formatIssue(path: PropertyKey[], message: string) {
  const field = path.length ? path.join(".") : "frontmatter";
  return `  - ${field}: ${message}`;
}

export async function validateOkf() {
  const files = await markdownFiles(okfRoot);
  const documents: ParsedDocument[] = [];
  const errors: string[] = [];

  for (const absoluteFile of files) {
    const file = relative(projectRoot, absoluteFile);

    try {
      const source = await readFile(absoluteFile, "utf8");
      const parsed = okfSchema.safeParse(readFrontmatter(source, file));

      if (!parsed.success) {
        errors.push(`${file}: frontmatter inválido`);
        errors.push(...parsed.error.issues.map((issue) => formatIssue(issue.path, issue.message)));
        continue;
      }

      const expected = expectedVisibility(absoluteFile);
      if (expected && parsed.data.visibility !== expected) {
        errors.push(
          `${file}: visibility deve ser "${expected}" por causa da pasta, mas recebeu "${parsed.data.visibility}".`,
        );
      }

      documents.push({ file, data: parsed.data });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const byId = new Map<string, ParsedDocument>();

  for (const document of documents) {
    const previous = byId.get(document.data.id);
    if (previous) {
      errors.push(
        `${document.file}: id duplicado "${document.data.id}"; já usado em ${previous.file}.`,
      );
    } else {
      byId.set(document.data.id, document);
    }
  }

  for (const document of documents) {
    for (const [index, relationship] of document.data.relationships.entries()) {
      const target = byId.get(relationship.target);
      if (!target) {
        errors.push(
          `${document.file}: relationships.${index}.target aponta para o id inexistente "${relationship.target}".`,
        );
        continue;
      }

      if (document.data.visibility === "public" && target.data.visibility !== "public") {
        errors.push(
          `${document.file}: documento público não pode se relacionar com o id não público "${relationship.target}".`,
        );
      }
    }

    if (document.data.supersedes && !byId.has(document.data.supersedes)) {
      errors.push(
        `${document.file}: supersedes aponta para o id inexistente "${document.data.supersedes}".`,
      );
    }
  }

  if (errors.length) {
    throw new Error(`Validação OKF falhou:\n${errors.join("\n")}`);
  }

  return { documents: documents.length, publicDocuments: documents.filter(({ data }) => data.visibility === "public").length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await validateOkf();
    console.log(
      `OKF v${OKF_SCHEMA_VERSION} válido: ${result.documents} documentos, ${result.publicDocuments} públicos.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
