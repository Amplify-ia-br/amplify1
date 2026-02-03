import { useState } from "react";
import { motion } from "framer-motion";
import avatarBot from "@/assets/avatar-bot.png";

const ChatBot = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  const loadChatBot = () => {
    if (isLoaded) return;

    // Load jQuery first
    const jqueryScript = document.createElement("script");
    jqueryScript.src = "https://code.jquery.com/jquery-3.7.1.min.js";
    jqueryScript.onload = () => {
      // After jQuery loads, load the in.bot script
      const inbotScript = document.createElement("script");
      inbotScript.id = "chatscript";
      inbotScript.src =
        "https://in.bot/api/inbot.gz.js?bot_id=1128&bot_token=21jygoakkt&bot_server_type=production";
      inbotScript.async = true;
      document.body.appendChild(inbotScript);
    };
    document.body.appendChild(jqueryScript);

    setIsLoaded(true);
  };

  // Hide the button once the chat is loaded
  if (isLoaded) {
    return null;
  }

  return (
    <motion.button
      onClick={loadChatBot}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow border-2 border-primary/50 bg-card"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Abrir chat"
    >
      <img
        src={avatarBot}
        alt="Assistente virtual"
        className="w-full h-full object-cover"
      />
    </motion.button>
  );
};

export default ChatBot;
