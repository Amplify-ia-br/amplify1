export const config = { runtime: "edge" };

const SYSTEM_PROMPT =
  "Você é Ana, estrategista de IA da Amplify. Conduza uma conversa curta de qualificação com um executivo brasileiro. Fale de forma natural, consultiva e humana. Use frases curtas. Reconheça brevemente a resposta anterior antes de avançar. Faça apenas uma pergunta por vez. Não use listas, markdown, jargões nem tom de venda. Evite parecer assistente virtual. Língua: português brasileiro.";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
// Voz da Ana via ElevenLabs. ELEVENLABS_VOICE_ID deve apontar para a voz
// escolhida na conta ElevenLabs (feminina, pt-BR, consultiva). O default é a
// voz premade "Sarah", trocável por env. eleven_multilingual_v2 entrega o
// melhor pt-BR; eleven_turbo_v2_5 reduz latência se necessário.
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
          ...messages.map((message) => ({
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
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
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
          model_id: ELEVENLABS_MODEL_ID,
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

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  let body;

  try {
    body = await request.json();
  } catch (_error) {
    return jsonResponse({ error: "Payload JSON inválido." }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const currentQuestion = String(body.currentQuestion || "").trim();

  if (!currentQuestion) {
    return jsonResponse({ error: "currentQuestion é obrigatório." }, 400);
  }

  try {
    const text = await generateAnaText(messages, currentQuestion);
    const audio = await generateAudio(text);

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "x-ana-text": encodeHeaderText(text),
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Erro ao gerar fala da Ana." }, 500);
  }
}
