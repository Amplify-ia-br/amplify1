import { motion } from "framer-motion";
import avatarBot from "@/assets/avatar-bot.png";

const FloatingChatBot = () => {
  const handleClick = () => {
    window.open("https://amplify.in.bot/", "_blank", "noopener,noreferrer");
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
