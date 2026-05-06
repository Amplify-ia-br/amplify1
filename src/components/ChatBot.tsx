import { useState } from "react";
import avatarBot from "@/assets/avatar-bot.png";

declare global {
  interface Window {
    inbot?: {
      open?: () => void;
      toggle?: () => void;
    };
  }
}

const JQUERY_SCRIPT_ID = "chatbot-jquery-script";
const INBOT_SCRIPT_ID = "chatscript";
const INBOT_SRC =
  "https://in.bot/api/inbot.gz.js?bot_id=1128&bot_token=21jygoakkt&bot_server_type=production";
const JQUERY_SRC = "https://code.jquery.com/jquery-3.7.1.min.js";

function openInbot() {
  if (window.inbot && typeof window.inbot.open === "function") {
    window.inbot.open();
    return true;
  }
  if (window.inbot && typeof window.inbot.toggle === "function") {
    window.inbot.toggle();
    return true;
  }
  document.dispatchEvent(new CustomEvent("inbot-open"));
  return false;
}

function waitAndOpenInbot(tries = 12) {
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (openInbot() || attempts >= tries) {
      window.clearInterval(timer);
    }
  }, 250);
}

function ensureInbotLoaded(onReady: () => void, onFail: () => void) {
  const existingInbot = document.getElementById(INBOT_SCRIPT_ID);
  if (existingInbot) {
    onReady();
    return;
  }

  const loadInbot = () => {
    const inbotScript = document.createElement("script");
    inbotScript.id = INBOT_SCRIPT_ID;
    inbotScript.src = INBOT_SRC;
    inbotScript.async = true;
    inbotScript.onload = onReady;
    inbotScript.onerror = onFail;
    document.body.appendChild(inbotScript);
  };

  const existingJquery = document.getElementById(JQUERY_SCRIPT_ID);
  if (existingJquery) {
    loadInbot();
    return;
  }

  const jqueryScript = document.createElement("script");
  jqueryScript.id = JQUERY_SCRIPT_ID;
  jqueryScript.src = JQUERY_SRC;
  jqueryScript.async = true;
  jqueryScript.onload = loadInbot;
  jqueryScript.onerror = onFail;
  document.body.appendChild(jqueryScript);
}

const ChatBot = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    ensureInbotLoaded(
      () => {
        waitAndOpenInbot();
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    // If already loaded, open immediately.
    if (openInbot()) {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow border-2 border-primary/50 bg-card"
      aria-label="Abrir chat com especialista"
    >
      <img
        src={avatarBot}
        alt="Chat com especialista Amplify"
        className="w-full h-full object-cover"
      />
      {isLoading ? (
        <span className="sr-only">Carregando chat</span>
      ) : null}
    </button>
  );
};

export default ChatBot;
