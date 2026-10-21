import type {
  AnaHandoffInput,
  QualificationEvidence,
} from "./types.js";

export const HANDOFF_NOTE_TITLE = "ANA — Handoff comercial";

function cleanLine(value: unknown): string {
  return String(value ?? "").trim();
}

function displayScore(value: number | null | undefined, suffix: string): string {
  return Number.isFinite(value) ? `${value}${suffix}` : "não informado";
}

function evidenceLines(evidence: AnaHandoffInput["evidence"]): string[] {
  if (Array.isArray(evidence)) {
    return evidence
      .map((item: QualificationEvidence) => {
        if (typeof item === "string") return cleanLine(item);
        const label = cleanLine(item.label);
        const value = cleanLine(item.value);
        return label && value ? `${label}: ${value}` : label || value;
      })
      .filter(Boolean);
  }

  if (evidence && typeof evidence === "object") {
    return Object.entries(evidence)
      .map(([label, value]) => `${cleanLine(label)}: ${cleanLine(value)}`)
      .filter((line) => !line.endsWith(": "));
  }

  return [];
}

export function normalizeHandoffId(handoffId: string): string {
  return cleanLine(handoffId).replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 160);
}

export function handoffNoteMarker(handoffId: string): string {
  return `[ANA_HANDOFF_ID:${normalizeHandoffId(handoffId)}]`;
}

export function buildHandoffNote(input: AnaHandoffInput): string {
  const scores = input.scores || {};
  const accountScore = scores.account ?? scores.icp;
  const evidence = evidenceLines(input.evidence);
  const lines = [
    HANDOFF_NOTE_TITLE,
    "",
    `Rota: ${cleanLine(input.route) || "não informada"}`,
  ];

  if (cleanLine(input.cluster)) lines.push(`Cluster: ${cleanLine(input.cluster)}`);
  if (cleanLine(input.product)) lines.push(`Produto: ${cleanLine(input.product)}`);

  lines.push(
    "",
    "Scores:",
    `- Conta: ${displayScore(accountScore, "")}`,
    `- Oportunidade: ${displayScore(scores.opportunity, "")}`,
    `- Total: ${displayScore(scores.total, "/100")}`,
    `- Completude: ${displayScore(scores.completeness, "%")}`,
  );

  if (evidence.length) {
    lines.push("", "Evidências:", ...evidence.map((item) => `- ${item}`));
  }

  lines.push(
    "",
    "Resumo da qualificação:",
    cleanLine(input.qualificationSummary) || "Não informado.",
  );

  if (cleanLine(input.nextAction)) {
    lines.push("", "Próxima ação:", cleanLine(input.nextAction));
  }

  lines.push("", handoffNoteMarker(input.handoffId));
  return lines.join("\n");
}
