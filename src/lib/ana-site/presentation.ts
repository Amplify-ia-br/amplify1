/** Public corporate identity only; preserve product names, email and URL hosts. */
export function publicSiteAnswer(text: string) {
  return text.replace(/\bAmplify\b(?!\s+Academy|[.@][a-z0-9])/gi, 'CRIATOWN');
}
