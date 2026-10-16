export type KnowledgeRelationship = { type: string; target: string };

export function parentTarget(relationships: KnowledgeRelationship[] | undefined) {
  return relationships?.find((relationship) => relationship.type === "document_of")?.target ?? null;
}

export function withParentRelationship(
  relationships: KnowledgeRelationship[] | undefined,
  target?: string | null,
) {
  const retained = (relationships ?? []).filter((relationship) => relationship.type !== "document_of");
  return target ? [...retained, { type: "document_of", target }] : retained;
}
