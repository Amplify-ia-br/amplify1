import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { okfSchema } from "@/lib/okf-schema";

const publicKnowledge = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./okf/public",
    retainBody: true,
    generateId: ({ data }) => String(data.id ?? ""),
  }),
  schema: okfSchema.refine(
    (document) => document.visibility === "public",
    "Documentos carregados na coleção pública precisam usar visibility: public.",
  ),
});

export const collections = {
  knowledge: publicKnowledge,
};
