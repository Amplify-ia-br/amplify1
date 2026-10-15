export const GOOGLE_DOC_MIME_TYPE = "application/vnd.google-apps.document";

type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  link?: { url?: string };
};

type GoogleStructuralElement = {
  paragraph?: {
    paragraphStyle?: { namedStyleType?: string };
    bullet?: unknown;
    elements?: Array<{ textRun?: { content?: string; textStyle?: TextStyle }; inlineObjectElement?: unknown }>;
  };
  table?: {
    tableRows?: Array<{ tableCells?: Array<{ content?: GoogleStructuralElement[] }> }>;
  };
};

export type GoogleDocumentPayload = {
  documentId: string;
  title?: string;
  revisionId?: string;
  body?: { content?: GoogleStructuralElement[] };
};

export type GoogleDocumentConversion = {
  title: string;
  markdown: string;
  warnings: string[];
};

export function extractGoogleDocId(value: string) {
  const trimmed = value.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export function slugifyKnowledgeId(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "documento";
}

function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]<>])/g, "\\$1");
}

function renderText(content: string, style: TextStyle = {}) {
  let result = escapeMarkdown(content.replace(/\n+$/, ""));
  if (!result.trim()) return result;
  if (style.bold) result = `**${result}**`;
  if (style.italic) result = `_${result}_`;
  if (style.strikethrough) result = `~~${result}~~`;
  if (style.link?.url) result = `[${result}](${style.link.url})`;
  return result;
}

function renderElements(elements: GoogleStructuralElement[], warnings: string[]): string[] {
  const lines: string[] = [];

  for (const element of elements) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      let text = "";
      for (const part of paragraph.elements ?? []) {
        if (part.textRun?.content) text += renderText(part.textRun.content, part.textRun.textStyle);
        if (part.inlineObjectElement) {
          text += "[Imagem do Google Docs — revisar antes de publicar]";
          if (!warnings.includes("Imagens precisam ser revisadas e reenviadas para a biblioteca da KB.")) {
            warnings.push("Imagens precisam ser revisadas e reenviadas para a biblioteca da KB.");
          }
        }
      }
      text = text.replace(/\n+$/, "");
      if (!text) continue;

      const namedStyle = paragraph.paragraphStyle?.namedStyleType ?? "NORMAL_TEXT";
      const headingMatch = namedStyle.match(/^HEADING_([1-6])$/);
      if (namedStyle === "TITLE") lines.push(`# ${text}`);
      else if (namedStyle === "SUBTITLE") lines.push(`> ${text}`);
      else if (headingMatch) lines.push(`${"#".repeat(Number(headingMatch[1]))} ${text}`);
      else if (paragraph.bullet) lines.push(`- ${text}`);
      else lines.push(text);
      continue;
    }

    if (element.table) {
      const rows = element.table.tableRows ?? [];
      const table = rows.map((row) => (row.tableCells ?? []).map((cell) =>
        renderElements(cell.content ?? [], warnings).join(" ").replace(/\|/g, "\\|")
      ));
      if (table.length > 0) {
        const width = Math.max(...table.map((row) => row.length));
        const normalized = table.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
        lines.push(`| ${normalized[0].join(" | ")} |`);
        lines.push(`| ${Array(width).fill("---").join(" | ")} |`);
        for (const row of normalized.slice(1)) lines.push(`| ${row.join(" | ")} |`);
      }
    }
  }

  return lines;
}

export function googleDocumentToMarkdown(document: GoogleDocumentPayload): GoogleDocumentConversion {
  const warnings: string[] = [];
  const title = document.title?.trim() || "Documento sem título";
  const lines = renderElements(document.body?.content ?? [], warnings);
  const markdown = lines
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, markdown, warnings };
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
