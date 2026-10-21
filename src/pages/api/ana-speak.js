import handler from "../../../api/ana-speak.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "ANTHROPIC_API_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "ELEVENLABS_MODEL_ID",
    "ANA_SPEECH_ALLOWED_ORIGINS",
    "ANA_SPEECH_RATE_LIMIT_MAX",
    "ANA_SPEECH_RATE_LIMIT_WINDOW_MS",
  ];
  for (const key of keys) {
    if (!process.env[key] && import.meta.env?.[key]) process.env[key] = import.meta.env[key];
  }
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
