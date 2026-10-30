/** Public corporate identity only; preserve product names, email and URL hosts. */
export function publicSiteAnswer(text: string) {
  return text.replace(/\bAmplify\b(?!\s+Academy|[.@][a-z0-9])/gi, 'CRIATOWN');
}

/** Tool arguments are never an instruction to execute, nor proof of a saved request. */
export function unsafeSiteAnswer(text: string, hasHandoff: boolean): boolean {
  // A validated tool result is replaced with the server's delivery status in HTTP.
  if (hasHandoff) return false;
  return /\b(?:consentQuote|routeEvidence|ufEvidence|request_handoff)\b|["'](?:summary|contact|route)["']\s*:/i.test(text)
    || /\b(?:anotei|registrei|encaminhei|enviei)\b.{0,80}\b(?:pedido|solicita[çc][aã]o|contato|dados|resumo)\b|\b(?:pedido|solicita[çc][aã]o|contato)\b.{0,40}\b(?:registrad[oa]|anotad[oa]|encaminhad[oa]|enviad[oa])\b/i.test(text);
}
