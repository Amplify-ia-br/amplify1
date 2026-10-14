import { z } from "zod-v4";

export const ANA_FACT_FIELDS = [
  "need", "organization", "organizationContext", "audience", "businessChallenge",
  "currentAiUse", "desiredOutcome", "mainConstraint", "timeline", "decisionProcess",
  "grades", "students", "internet",
] as const;

export const ANA_QUESTION_FIELDS = [...ANA_FACT_FIELDS, "name", "contactConsent", "contact"] as const;

// Every key is required (nullable instead of optional) so strict structured-output
// providers accept the schema.
export const anaTurnOutputSchema = z.object({
  reply: z.string().describe("A resposta que a pessoa verá, em português brasileiro, sem Markdown."),
  turnKind: z.enum(["greeting", "repair", "acknowledgement", "gratitude", "farewell", "disclosure", "request"])
    .describe("Natureza da última mensagem da pessoa."),
  userName: z.string().nullable().describe("Nome que a PESSOA disse ser o dela, copiado da mensagem. Nunca cargo, cidade ou profissão."),
  offerInterest: z.enum(["leia", "academy", "consulting", "product-development"]).nullable(),
  wantsToAdvance: z.boolean().describe("A pessoa pediu proposta, contratação, reunião, próximo passo ou contato humano (agora ou antes)."),
  wantsMeeting: z.boolean(),
  asksPricing: z.boolean().describe("A última mensagem pergunta preço, valor ou investimento."),
  contactConsent: z.enum(["granted", "refused"]).nullable()
    .describe("granted só se a pessoa autorizou contato neste turno; refused se recusou ou revogou."),
  schoolSector: z.enum(["private", "public"]).nullable(),
  gradeFit: z.boolean().nullable().describe("A escola atende do 9º ano do Fundamental à 3ª série do Médio."),
  studentCount: z.number().nullable(),
  internetReady: z.boolean().nullable(),
  facts: z.array(z.object({
    field: z.enum(ANA_FACT_FIELDS),
    status: z.enum(["provided", "unknown", "declined"]),
    value: z.string().describe("Resumo curto do que a pessoa disse."),
    evidence: z.string().describe("Trecho copiado literalmente das mensagens da PESSOA que sustenta o fato."),
  })).describe("Somente fatos que a pessoa afirmou. Nunca deduza nem use o que a Ana disse."),
  questionField: z.enum(ANA_QUESTION_FIELDS).nullable()
    .describe("Qual dado a pergunta da resposta busca; null se a resposta não tem pergunta."),
});

export type AnaTurnOutput = z.infer<typeof anaTurnOutputSchema>;
