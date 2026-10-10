export function normalizeAnaProductName(value: string) {
  return value.replace(/\bL\s*\.\s*E\s*\.\s*I\s*\.\s*A(?:\s*\.{1,2})?/gi, "L.E.I.A.");
}
