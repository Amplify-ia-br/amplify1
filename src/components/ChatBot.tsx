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
const HIDE_STYLE_ID = "amplify-hide-inbot-launcher-style";
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

function hideProviderLaunchers() {
  const selectors = [
    '[id*="inbot" i]',
    '[class*="inbot" i]',
    'iframe[src*="in.bot"]',
    'iframe[src*="inbot"]',
  ];

  for (const selector of selectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.id === CUSTOM_BUTTON_ID) return;
      // Keep the chat window itself; hide only launcher-sized elements.
      const rect = el.getBoundingClientRect();
      const looksLikeLauncher = rect.width <= 220 && rect.height <= 220;
      if (looksLikeLauncher) {
        el.style.setProperty("display", "none", "important");
        el.style.setProperty("visibility", "hidden", "important");
        el.setAttribute("aria-hidden", "true");
      }
    });
  }
}

function clickProviderLauncherFallback() {
  const clickableSelectors = [
    '[id*="inbot" i][role="button"]',
    '[class*="inbot" i][role="button"]',
    '[id*="inbot" i]',
    '[class*="inbot" i]',
  ];

  for (const selector of clickableSelectors) {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const node of nodes) {
      if (node.id === CUSTOM_BUTTON_ID) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 260 && rect.height <= 260) {
        node.click();
        return true;
      }
    }
  }
  return false;
}

const ChatBot = () => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!document.getElementById(HIDE_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = HIDE_STYLE_ID;
      style.textContent = `
        iframe[src*="in.bot"][style*="bottom"],
        iframe[src*="inbot"][style*="bottom"],
        [id*="inbot" i][style*="bottom"],
        [class*="inbot" i][style*="bottom"] {
          display: none !important;
          visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }

    hideProviderLaunchers();
    const observer = new MutationObserver(() => hideProviderLaunchers());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
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
