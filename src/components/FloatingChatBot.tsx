import { motion } from "framer-motion";
import avatarBot from "@/assets/avatar-bot.png";

declare global {
  interface Window {
    inbot?: {
      open?: () => void;
      toggle?: () => void;
    };
  }
}

const FloatingChatBot = () => {
  const handleClick = () => {
    // Tenta abrir o chatbot in.bot
    if (window.inbot && typeof window.inbot.open === 'function') {
      window.inbot.open();
    } else if (window.inbot && typeof window.inbot.toggle === 'function') {
      window.inbot.toggle();
    } else {
      // Fallback: dispara evento customizado que o script in.bot pode escutar
      const event = new CustomEvent('inbot-open');
      document.dispatchEvent(event);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 glow-cyan"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
      aria-label="Abrir chat com especialista"
    >
      <img
        src={avatarBot}
        alt="Chat com especialista Amplify"
        className="w-16 h-16 md:w-20 md:h-20 object-cover"
      />
    </motion.button>
  );
};

export default FloatingChatBot;
