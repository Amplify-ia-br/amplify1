export function normalizeAnaProductName(value: string) {
  return value.replace(/\bL\s*\.\s*E\s*\.\s*I\s*\.\s*A(?:\s*\.{1,2})?/gi, "L.E.I.A.");
}

export function formatAnaAssistantText(value: string) {
  return normalizeAnaProductName(
    value.replace(/\*\*(.*?)\*\*/g, "$1").replace(/([.!?])(?=[A-ZÀ-Ý])/g, "$1 "),
  ).trim();
}
