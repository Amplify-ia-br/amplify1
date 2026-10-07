type VercelRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
  on(event: "data" | "end" | "error", listener: (value?: unknown) => void): void;
};

type VercelResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: Uint8Array): void;
};

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function requestUrl(request: VercelRequest) {
  const headers = request.headers ?? {};
  const protocol = firstHeader(headers["x-forwarded-proto"]) || "https";
  const host = firstHeader(headers["x-forwarded-host"]) || firstHeader(headers.host) || "localhost";
  return new URL(request.url || "/", `${protocol}://${host}`);
}

function requestHeaders(request: VercelRequest) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }

  return headers;
}

async function requestBody(request: VercelRequest) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk ?? ""))));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

export async function toWebRequest(request: VercelRequest) {
  const method = String(request.method || "GET").toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await requestBody(request);

  return new Request(requestUrl(request), {
    method,
    headers: requestHeaders(request),
    body,
  });
}

export async function sendWebResponse(response: VercelResponse, webResponse: Response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, name) => response.setHeader(name, value));
  response.end(new Uint8Array(await webResponse.arrayBuffer()));
}

export function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function methodNotAllowed() {
  return new Response(JSON.stringify({ error: "method_not_allowed" }), {
    status: 405,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export type { VercelRequest, VercelResponse };
