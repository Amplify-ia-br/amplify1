import { z } from "astro/zod";

export const OKF_SCHEMA_VERSION = "0.1";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OKF_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return value;
};

const isCalendarDate = (value: string) => {
  if (!ISO_DATE.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const okfDateSchema = z.preprocess(
  normalizeDate,
  z.string().refine(isCalendarDate, "Use uma data válida no formato YYYY-MM-DD."),
);

export const okfRelationshipSchema = z
  .object({
    type: z.string().trim().min(1, "Informe o tipo da relação."),
    target: z.string().regex(OKF_ID, "Use o id de destino em kebab-case."),
  })
  .strict();

export const okfSchema = z
  .object({
    id: z.string().regex(OKF_ID, "Use um id único em kebab-case."),
    title: z.string().trim().min(1, "Informe o título."),
    description: z.string().trim().min(1, "Informe uma descrição."),
    type: z.string().trim().min(1, "Informe o tipo do documento."),
    visibility: z.enum(["public", "internal", "restricted"]),
    status: z.enum(["draft", "review", "approved", "active", "deprecated"]),
    owner: z.string().trim().min(1, "Informe o responsável."),
    reviewer: z.string().trim().min(1, "O revisor não pode ser vazio.").optional(),
    source_of_truth: z.boolean(),
    tags: z.array(z.string().trim().min(1, "Tags não podem ser vazias.")),
    sources: z.array(z.string().trim().min(1, "Fontes não podem ser vazias.")),
    relationships: z.array(okfRelationshipSchema),
    last_reviewed: okfDateSchema,
    review_due: okfDateSchema.optional(),
    updated_at: okfDateSchema,
    supersedes: z.string().regex(OKF_ID, "Use o id substituído em kebab-case.").optional(),
  })
  .strict();

export type OkfDocument = z.infer<typeof okfSchema>;
