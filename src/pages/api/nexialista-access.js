import handler from "../../../api/nexialista-access.js";

export const prerender = false;

function syncServerEnv() {
  const keys = ["NEXIALISTA_ACCESS_SECRET", "STRIPE_SECRET_KEY", "DATABASE_URL", "KIT_API_KEY"];

  keys.forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) {
      process.env[key] = import.meta.env?.[key];
    }
  });
}

function createNodeResponse() {
  const headers = new Headers();
  let statusCode = 200;
  let body = "";

  return {
    nodeResponse: {
      get statusCode() {
        return statusCode;
      },
      set statusCode(value) {
        statusCode = value;
      },
      setHeader(key, value) {
        headers.set(key, value);
      },
      end(value = "") {
        body = value;
      },
    },
    toResponse() {
      return new Response(body, { status: statusCode, headers });
    },
  };
}

function createNodeRequest(request) {
  return {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: undefined,
    async *[Symbol.asyncIterator]() {
      const text = await request.text();
      if (text) yield Buffer.from(text);
    },
  };
}

export async function POST({ request }) {
  syncServerEnv();
  const { nodeResponse, toResponse } = createNodeResponse();
  await handler(createNodeRequest(request), nodeResponse);
  return toResponse();
}
