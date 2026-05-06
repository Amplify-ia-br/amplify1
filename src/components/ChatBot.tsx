import { useEffect, useState } from "react";
import avatarBot from "@/assets/avatar-bot.png";

declare global {
  interface Window {
    inbot?: {
      open?: () => void;
      toggle?: () => void;
    };
  }
}

const INBOT_SCRIPT_ID = "inbot-script";
const INBOT_SRC =
  "https://in.bot/api/inbot.gz.js?bot_id=1128&bot_token=21jygoakkt&bot_server_type=production";

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

const ChatBot = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existing = document.getElementById(INBOT_SCRIPT_ID);
    if (existing) return;

    const script = document.createElement("script");
    script.id = INBOT_SCRIPT_ID;
    script.src = INBOT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleClick = () => {
    const opened = openInbot();
    if (opened) return;

    if (document.getElementById(INBOT_SCRIPT_ID)) return;

    setIsLoading(true);
    const script = document.createElement("script");
    script.id = INBOT_SCRIPT_ID;
    script.src = INBOT_SRC;
    script.async = true;
    script.onload = () => {
      setIsLoading(false);
      openInbot();
    };
    script.onerror = () => {
      setIsLoading(false);
    };
    document.body.appendChild(script);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 glow-cyan"
      aria-label="Abrir chat com especialista"
    >
      <img
        src={avatarBot}
        alt="Chat com especialista Amplify"
        className="w-16 h-16 md:w-20 md:h-20 object-cover"
      />
      {isLoading ? (
        <span className="sr-only">Carregando chat</span>
      ) : null}
    </button>
  );
};

export default ChatBot;
