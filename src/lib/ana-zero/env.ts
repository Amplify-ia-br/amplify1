// O `astro dev` expõe o .env.development.local em import.meta.env, não em process.env.
// Em produção (Vercel) as variáveis chegam por process.env.
export function readServerEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  return metaEnv?.[name]?.trim() || undefined;
}
