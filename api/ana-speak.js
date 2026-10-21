export const config = { runtime: "edge" };

const SYSTEM_PROMPT =
  "Você é Ana, estrategista de IA da Amplify. Conduza uma conversa curta de qualificação com pessoas e organizações brasileiras. Fale de forma natural, consultiva e humana. Use frases curtas. Reconheça brevemente a resposta anterior antes de avançar. Faça apenas uma pergunta por vez e preserve exatamente a pergunta fornecida pelo sistema. Não use listas, markdown, jargões nem pressão comercial. Não invente preços, condições, produtos ou critérios. Língua: português brasileiro.";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_RATE_LIMIT_MAX = 20;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUEST_BODY_CHARS = 24_000;
const SENSITIVE_HISTORY_FIELDS = new Set(["name", "email", "phone"]);
const speechRateLimit = createFixedWindowRateLimiter();
// Voz da Ana via ElevenLabs. ELEVENLABS_VOICE_ID deve apontar para a voz
// escolhida na conta ElevenLabs (feminina, pt-BR, consultiva). O default é a
// voz premade "Sarah", trocável por env. eleven_multilingual_v2 entrega o
// melhor pt-BR; eleven_turbo_v2_5 reduz latência se necessário.
function getElevenLabsVoiceId() {
  return process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
}

function getElevenLabsModelId() {
  return process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

export function redactSpeechText(value) {
  return String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-mail omitido]")
    .replace(/(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9[\s.-]?)?\d{4}[\s.-]?\d{4}(?!\d)/g, "[telefone omitido]");
}

export function sanitizeSpeechMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && typeof message === "object")
    .slice(-16)
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: SENSITIVE_HISTORY_FIELDS.has(String(message.field || ""))
        ? "Dado pessoal informado e omitido por privacidade."
        : redactSpeechText(message.content).slice(0, 1200),
    }));
}

export function createFixedWindowRateLimiter({ now = () => Date.now() } = {}) {
  const buckets = new Map();

  return ({ key, limit, windowMs }) => {
    const timestamp = now();
    const existing = buckets.get(key);
    const bucket = !existing || timestamp >= existing.resetAt
      ? { count: 0, resetAt: timestamp + windowMs }
      : existing;

    bucket.count += 1;
    buckets.set(key, bucket);

    if (buckets.size > 1_000) {
      for (const [storedKey, storedBucket] of buckets) {
        if (timestamp >= storedBucket.resetAt) buckets.delete(storedKey);
      }
    }

    return {
      allowed: bucket.count <= limit,
      remaining: Math.max(0, limit - bucket.count),
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1_000)),
    };
  };
}

function requestClientKey(request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  return forwarded.split(",")[0].trim().slice(0, 128) || "anonymous";
}

function originAllowed(request, configuredOrigins = "") {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let requestOrigin;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch (_error) {
    return false;
  }

  const allowedOrigins = String(configuredOrigins)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return origin === requestOrigin || allowedOrigins.includes(origin);
}

function encodeHeaderText(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function generateAnaText(messages, currentQuestion) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY não configurada.");
  }

  const timeout = withTimeout(6500);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: timeout.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [
          ...messages.slice(-16).map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: String(message.content || "").slice(0, 1200),
          })),
          {
            role: "user",
            content: `Gere a próxima fala da Ana em no máximo duas frases. Se houver histórico, reconheça brevemente a última resposta do usuário. Termine fazendo exatamente esta pergunta quando houver pergunta: "${currentQuestion}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic retornou ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    const text = payload.content
      ?.filter((item) => item.type === "text")
      .map((item) => item.text)
      .join(" ")
      .trim();

    if (!text) {
      throw new Error("Anthropic não retornou texto.");
    }

    return text;
  } finally {
    timeout.clear();
  }
}

async function generateAudio(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY não configurada.");
  }

  const timeout = withTimeout(6500);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${getElevenLabsVoiceId()}?output_format=mp3_44100_128`,
      {
        method: "POST",
        signal: timeout.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: getElevenLabsModelId(),
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS retornou ${response.status}: ${errorText}`);
    }

    return response.arrayBuffer();
  } finally {
    timeout.clear();
  }
}

export function createAnaSpeakHandler({
  generateText = generateAnaText,
  generateSpeech = generateAudio,
  consumeRateLimit = speechRateLimit,
  env = process.env,
} = {}) {
  return async function handler(request) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Método não permitido." }, 405, { Allow: "POST" });
    }

    if (!originAllowed(request, env.ANA_SPEECH_ALLOWED_ORIGINS)) {
      return jsonResponse(
        { error: "Origem não autorizada.", code: "ana_speech_origin_forbidden" },
        403,
      );
    }

    const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_CHARS) {
      return jsonResponse(
        { error: "Payload muito grande.", code: "ana_speech_payload_too_large" },
        413,
      );
    }

    const rateLimitMax = positiveInteger(env.ANA_SPEECH_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX, 120);
    const rateLimitWindowMs = positiveInteger(
      env.ANA_SPEECH_RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS,
      3_600_000,
    );
    const limit = consumeRateLimit({
      key: requestClientKey(request),
      limit: rateLimitMax,
      windowMs: rateLimitWindowMs,
    });

    if (!limit.allowed) {
      return jsonResponse(
        {
          error: "Muitas solicitações de voz. Aguarde um instante ou continue por texto.",
          code: "ana_speech_rate_limited",
        },
        429,
        { "Retry-After": String(limit.retryAfterSeconds) },
      );
    }

    let body;
    try {
      const rawBody = await request.text();
      if (rawBody.length > MAX_REQUEST_BODY_CHARS) {
        return jsonResponse(
          { error: "Payload muito grande.", code: "ana_speech_payload_too_large" },
          413,
        );
      }
      body = JSON.parse(rawBody);
    } catch (_error) {
      return jsonResponse({ error: "Payload JSON inválido." }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ error: "Payload JSON inválido." }, 400);
    }

    const messages = sanitizeSpeechMessages(body.messages);
    const currentQuestion = redactSpeechText(body.currentQuestion).trim().slice(0, 500);

    if (!currentQuestion) {
      return jsonResponse({ error: "currentQuestion é obrigatório." }, 400);
    }

    try {
      const generatedText = await generateText(messages, currentQuestion);
      const text = redactSpeechText(generatedText).trim().slice(0, 1_500);
      if (!text) throw new Error("A geração da fala retornou texto vazio.");
      const audio = await generateSpeech(text);

      return new Response(audio, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "x-ana-text": encodeHeaderText(text),
        },
      });
    } catch (error) {
      console.error("Erro ao gerar fala da Ana:", error);
      return jsonResponse(
        {
          error: "A voz da Ana não está disponível agora. Você pode continuar por texto.",
          code: "ana_speech_unavailable",
        },
        503,
      );
    }
  };
}

export default createAnaSpeakHandler();
