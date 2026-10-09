import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import node from "@astrojs/node";

const isLighthouseCi = process.env.LIGHTHOUSE_CI === "true";

export default defineConfig({
  output: "server",
  adapter: isLighthouseCi ? node({ mode: "standalone" }) : vercel(),
  integrations: [tailwind(), react()],
  site: "https://amplify.ia.br",
  // This project still uses the Vite-style public variable names created by
  // the original React app. Astro exposes only PUBLIC_* by default.
  vite: {
    envPrefix: ["PUBLIC_", "VITE_"],
  },
});
