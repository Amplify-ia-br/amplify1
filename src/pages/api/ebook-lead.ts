import type { APIRoute } from "astro";

export const prerender = false;

// Credenciais do Kit (ex-ConvertKit) — definidas como env vars na Vercel.
// KIT_API_KEY: API key (v3) da conta Kit.
// KIT_FORM_ID: ID do formulário Kit ao qual o lead será inscrito.
const KIT_API_KEY = process.env.KIT_API_KEY ?? import.meta.env.KIT_API_KEY;
const KIT_FORM_ID = process.env.KIT_FORM_ID ?? import.meta.env.KIT_FORM_ID;

const emailValido = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: { name?: string; email?: string; site?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const site = (payload.site ?? "").trim();

  if (!name || !emailValido(email)) {
    return json({ ok: false, error: "invalid_fields" }, 422);
  }

  // Sem credenciais configuradas: não bloqueia o usuário (download segue no client).
  if (!KIT_API_KEY || !KIT_FORM_ID) {
    return json({ ok: false, error: "kit_not_configured", captured: false });
  }

  try {
    const res = await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: KIT_API_KEY,
        email,
        first_name: name.split(" ")[0],
        fields: {
          full_name: name,
          company_site: site || undefined,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("Kit subscribe falhou:", res.status, detail);
      return json({ ok: false, error: "kit_error", captured: false });
    }

    return json({ ok: true, captured: true });
  } catch (err) {
    console.warn("Erro ao chamar Kit:", err);
    return json({ ok: false, error: "kit_unreachable", captured: false });
  }
};
