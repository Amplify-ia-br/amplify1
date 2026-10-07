import { createKnowledgeService } from "@/lib/okf/core";

const base = {
  visibility: "public" as const,
  status: "approved" as const,
  owner: "knowledge",
  source_of_truth: true,
  sources: [],
  relationships: [],
  last_reviewed: "2026-10-07",
  updated_at: "2026-10-07",
};

export const testEntries = [
  {
    id: "company",
    filePath: "okf/public/company.md",
    data: {
      ...base,
      id: "company",
      title: "Amplify",
      description: "Posicionamento institucional da Amplify.",
      type: "company",
      tags: ["empresa", "posicionamento"],
    },
    body: "# Amplify\n\nA Amplify ajuda empresas e governos a aplicar Inteligência Artificial.",
  },
  {
    id: "amplify-academy",
    filePath: "okf/public/amplify-academy.md",
    data: {
      ...base,
      id: "amplify-academy",
      title: "Amplify Academy",
      description: "Educação e formação em Inteligência Artificial.",
      type: "education",
      tags: ["educação", "formação"],
    },
    body: "# Amplify Academy\n\nFormação para desenvolver fluência em Inteligência Artificial.",
  },
  {
    id: "offers",
    filePath: "okf/public/offers.md",
    data: {
      ...base,
      id: "offers",
      title: "Catálogo de ofertas",
      description: "Documento ainda em revisão.",
      type: "offering",
      status: "review" as const,
      tags: ["ofertas"],
    },
    body: "# Catálogo de ofertas\n\nConteúdo ainda não publicável.",
  },
  {
    id: "commercial-policy",
    filePath: "okf/internal/commercial-policy.md",
    data: {
      ...base,
      id: "commercial-policy",
      title: "Política comercial",
      description: "Conteúdo exclusivamente interno.",
      type: "policy",
      visibility: "internal" as const,
      status: "active" as const,
      tags: ["preço"],
    },
    body: "# Política comercial\n\nPreço só pode ser informado quando houver uma referência vigente e aprovada.",
  },
  {
    id: "restricted-area",
    filePath: "okf/restricted/README.md",
    data: {
      ...base,
      id: "restricted-area",
      title: "Área restrita",
      description: "Conteúdo restrito.",
      type: "index",
      visibility: "restricted" as const,
      status: "active" as const,
      tags: ["restrito"],
    },
    body: "# Área restrita\n\nEsta pasta é reservada para documentos cuja leitura depende de autorização específica.",
  },
];

export function createTestKnowledgeService() {
  return createKnowledgeService(async () => testEntries);
}
