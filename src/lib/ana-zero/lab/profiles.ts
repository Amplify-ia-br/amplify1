export const LAB_PROFILES = [
  { id: "dono_escola", label: "Dono(a) de escola" },
  { id: "gestor_educacional", label: "Gestor(a) educacional" },
  { id: "professor", label: "Professor(a)" },
  { id: "profissional_empresa", label: "Profissional de empresa" },
  { id: "estudante", label: "Estudante" },
  { id: "outro", label: "Outro" },
] as const;

export const LAB_PROFILE_IDS = LAB_PROFILES.map((profile) => profile.id) as [
  (typeof LAB_PROFILES)[number]["id"],
  ...(typeof LAB_PROFILES)[number]["id"][],
];

export const profileLabel = (id: string) => LAB_PROFILES.find((profile) => profile.id === id)?.label ?? id;

export const CONSENT_VERSION = "2026-10-v1";

export const CONSENT_TEXT =
  "Concordo que minhas conversas com a Ana e minhas avaliações sejam gravadas e analisadas pela Amplify para melhorar a Ana. Não vou escrever dados sensíveis (CPF, senhas, documentos). Nenhum contato meu é enviado ao time comercial.";
