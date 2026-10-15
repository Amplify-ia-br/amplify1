import { stringify } from "yaml";
import { okfSchema, type OkfDocument } from "@/lib/okf-schema";

export function buildPublishedOkfFile(
  metadata: Record<string, unknown>,
  contentMarkdown: string,
  date = new Date().toISOString().slice(0, 10),
) {
  const parsed = okfSchema.parse({
    ...metadata,
    status: "active",
    last_reviewed: date,
    updated_at: date,
  }) as OkfDocument;
  const frontmatter = stringify(parsed, { lineWidth: 0 }).trim();
  return `---\n${frontmatter}\n---\n\n${contentMarkdown.trim()}\n`;
}

export function publishedOkfPath(metadata: Pick<OkfDocument, "id" | "visibility">) {
  return `okf/${metadata.visibility}/${metadata.id}.md`;
}
