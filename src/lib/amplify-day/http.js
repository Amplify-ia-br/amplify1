export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function sendJson(response, payload, status = 200) {
  if (!response) return jsonResponse(payload, status);
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

export async function readJsonBody(request) {
  if (typeof request.json === "function") return request.json();
  if (request.body && typeof request.body === "object") return request.body;
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function getRequestOrigin(request) {
  if (request.url) {
    try {
      return new URL(request.url, "https://amplify.ia.br").origin;
    } catch (_error) {
      // Continue with forwarded headers.
    }
  }
  const getHeader = (name) => request.headers?.get
    ? request.headers.get(name)
    : request.headers?.[name.toLowerCase()];
  const host = getHeader("x-forwarded-host") || getHeader("host") || "amplify.ia.br";
  const protocol = getHeader("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}
