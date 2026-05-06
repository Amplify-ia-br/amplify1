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

const JQUERY_SCRIPT_ID = "chatbot-jquery-script";
const INBOT_SCRIPT_ID = "chatscript";
const CUSTOM_BUTTON_ID = "amplify-custom-chatbot-button";
const INBOT_SRC =
  "https://in.bot/api/inbot.gz.js?bot_id=1128&bot_token=21jygoakkt&bot_server_type=production";
const JQUERY_SRC = "https://code.jquery.com/jquery-3.7.1.min.js";

function openInbot() {
  if (window.inbot && typeof (window.inbot as { open_chat?: (arg?: unknown) => void }).open_chat === "function") {
    (window.inbot as { open_chat: (arg?: unknown) => void }).open_chat({ caller: "amplify_custom_button" });
    return true;
  }
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

function clickProviderLauncherFallback() {
  const clickableSelectors = [
    "#bot_icon",
    "#mini_box_chat",
    '[onclick*="open_chat"]',
    '[id*="inbot" i][role="button"]',
    '[class*="inbot" i][role="button"]',
  ];

  for (const selector of clickableSelectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const node of nodes) {
      if (node.id === CUSTOM_BUTTON_ID) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 360 && rect.height <= 360) {
        node.click();
        return true;
      }
    }
  }
  return false;
}

const ChatBot = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const syncInbotUi = () => {
      const miniBox = document.getElementById("mini_box_chat") as HTMLElement | null;
      const botIcon = document.getElementById("bot_icon") as HTMLElement | null;
      const botPointer = document.getElementById("bot_icon_pointer") as HTMLElement | null;
      const boxChat = document.getElementById("box_chat") as HTMLElement | null;

      // Hide provider launchers; keep only our custom launcher.
      if (miniBox) miniBox.style.setProperty("display", "none", "important");
      if (botIcon) botIcon.style.setProperty("display", "none", "important");
      if (botPointer) botPointer.style.setProperty("display", "none", "important");

      if (boxChat) {
        const visible = boxChat.style.display !== "none" && boxChat.offsetParent !== null;
        setIsChatOpen(visible);
      }
    };

    const timer = window.setInterval(syncInbotUi, 300);
    syncInbotUi();
    return () => window.clearInterval(timer);
  }, []);

  const handleClick = () => {
    setIsLoading(true);
    ensureInbotLoaded(
      () => {
        waitAndOpenInbot();
        window.setTimeout(() => {
          if (!openInbot()) {
            clickProviderLauncherFallback();
          }
        }, 400);
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );

    // If already loaded, open immediately.
    if (openInbot()) {
      setIsLoading(false);
      return;
    }

    // Final fallback for cases where provider API methods are unavailable.
    clickProviderLauncherFallback();
    setIsLoading(false);
  };

  return (
    <button
      id={CUSTOM_BUTTON_ID}
      type="button"
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-[2147483647] w-14 h-14 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow border-2 border-primary/50 bg-card ${isChatOpen ? "hidden" : ""}`}
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
