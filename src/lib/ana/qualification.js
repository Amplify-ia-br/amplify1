import {
  calculateCompleteness,
  emptyQualificationScore,
  evaluateLeiaGates,
  scoreLeiaQualification,
} from "./scoring.js";
import { mapRegionTag, normalizeUf } from "./region.js";

export const QUALIFICATION_SCHEMA_VERSION = "ana-qualification-v1.0.0";

export const INTERNAL_QUALIFICATION_FIELDS = Object.freeze([
  "reputacao_escola",
  "reputacao_escola_justificativa",
  "reputacao_escola_fonte",
  "reputacao_escola_responsavel",
  "next_action",
  "engagement_status",
]);

const SKIP_VALUES = new Set([
  "skip",
  "pular",
  "prefiro nao responder",
  "prefiro não responder",
  "nao quero responder",
  "não quero responder",
  "nao sei",
  "não sei",
  "desconhecido",
]);

const QUESTIONS = Object.freeze({
  need: {
    field: "need",
    prompt: "O que você está buscando fazer com Inteligência Artificial?",
    importance: "hard",
    input: "text",
  },
  name: {
    field: "name",
    prompt: "Antes de continuarmos, como posso te chamar?",
    importance: "hard",
    input: "text",
    retryPrompt: "Pode me dizer ao menos seu primeiro nome?",
  },
  scope: {
    field: "scope",
    prompt: "Isso é algo para você ou envolve alguma organização?",
    importance: "hard",
    input: "single_choice",
    options: ["individual", "organization"],
  },
  organization_type: {
    field: "organization_type",
    prompt: "Que tipo de organização está envolvida?",
    importance: "hard",
    input: "single_choice",
    options: ["company", "school", "government", "other"],
  },
  organization_name: {
    field: "organization_name",
    prompt: "Qual é o nome da organização?",
    importance: "hard",
    input: "text",
    retryPrompt: "Pode me dizer ao menos o nome pelo qual a organização é conhecida?",
  },
  website: {
    field: "website",
    prompt: "Você pode me passar o site? Assim evito perguntar o que consigo verificar por lá.",
    importance: "soft",
    input: "url",
  },
  school_type: {
    field: "school_type",
    prompt: "A escola é particular ou pública?",
    importance: "hard",
    input: "single_choice",
    options: ["private", "public"],
  },
  school_initiative_type: {
    field: "school_initiative_type",
    prompt: "Essa iniciativa é principalmente para estudantes, para profissionais da educação ou para melhorar processos da instituição?",
    importance: "hard",
    input: "single_choice",
    options: ["students", "professionals", "processes"],
  },
  school_levels: {
    field: "school_levels",
    prompt: "Quais etapas de ensino a escola atende hoje?",
    importance: "hard",
    input: "multi_choice",
  },
  eligible_students: {
    field: "eligible_students",
    prompt: "Aproximadamente quantos estudantes estão hoje entre o 9º ano e a 3ª série do Ensino Médio?",
    importance: "medium",
    input: "number",
    retryPrompt:
      "Uma estimativa já ajuda, mesmo que aproximada. Se você não tiver essa informação agora, podemos seguir.",
  },
  tuition_band: {
    field: "tuition_band",
    prompt:
      "Para entendermos a viabilidade do modelo para as famílias, em qual faixa fica aproximadamente a mensalidade do Ensino Médio? Se preferir, podemos deixar essa informação para a conversa comercial.",
    importance: "soft",
    input: "currency_band",
    options: ["below_1000", "from_1000_to_1499", "from_1500_to_1999", "above_2000"],
  },
  education_audience: {
    field: "education_audience",
    prompt: "Quais estudantes ou profissionais da educação seriam atendidos pela iniciativa?",
    importance: "medium",
    input: "text",
    retryPrompt: "Uma indicação aproximada do público já ajuda. Se ainda não souber, podemos seguir.",
  },
  contact_role: {
    field: "contact_role",
    prompt: "Qual é o seu papel na organização e quem costuma participar dessa decisão?",
    importance: "medium",
    input: "text",
    retryPrompt: "Pode me dizer ao menos sua função ou relação com essa decisão?",
  },
  target_year: {
    field: "target_year",
    prompt: "Para qual ano letivo vocês estão avaliando essa iniciativa?",
    importance: "medium",
    input: "year",
    retryPrompt: "Mesmo uma estimativa de ano já ajuda. Se ainda não houver definição, podemos seguir.",
  },
  business_area: {
    field: "business_area",
    prompt: "Qual equipe, área ou processo seria mais impactado por essa iniciativa?",
    importance: "medium",
    input: "text",
    retryPrompt: "Uma área aproximada já ajuda. Se isso ainda estiver em aberto, podemos seguir.",
  },
  people_impacted: {
    field: "people_impacted",
    prompt: "Aproximadamente quantas pessoas seriam impactadas?",
    importance: "medium",
    input: "number_or_text",
    retryPrompt: "Pode ser apenas uma estimativa. Se ainda não souber, podemos seguir.",
  },
  ai_stage: {
    field: "ai_stage",
    prompt: "Hoje vocês estão explorando, testando, implantando ou escalando o uso de IA?",
    importance: "soft",
    input: "single_choice",
    options: ["exploring", "testing", "implementing", "scaling"],
  },
  government_level: {
    field: "government_level",
    prompt: "A iniciativa envolve um órgão municipal, estadual ou federal?",
    importance: "medium",
    input: "single_choice",
    options: ["municipal", "state", "federal", "other"],
    retryPrompt: "Se essa definição ainda não estiver clara, podemos seguir.",
  },
  government_audience: {
    field: "government_audience",
    prompt: "Quais áreas, lideranças ou grupos de servidores seriam atendidos?",
    importance: "medium",
    input: "text",
    retryPrompt: "Uma indicação geral do público já ajuda. Se ainda não souber, podemos seguir.",
  },
  experience_level: {
    field: "experience_level",
    prompt: "Como você descreveria sua experiência atual com IA?",
    importance: "soft",
    input: "single_choice",
    options: ["beginner", "intermediate", "advanced"],
  },
  timeline: {
    field: "timeline",
    prompt: "Quando você gostaria de começar?",
    importance: "medium",
    input: "single_choice",
    options: ["now", "within_3_months", "within_6_months", "later", "undefined"],
    retryPrompt: "Pode ser apenas uma estimativa. Se ainda não houver prazo, podemos seguir.",
  },
  uf: {
    field: "uf",
    prompt: "Em qual estado fica a unidade ou operação que seria atendida?",
    importance: "hard",
    input: "state",
  },
  email: {
    field: "email",
    prompt: "Qual e-mail devemos usar para o próximo passo combinado?",
    importance: "hard",
    input: "email",
  },
  preferred_contact: {
    field: "preferred_contact",
    prompt: "Por qual canal você prefere seguir com o próximo passo?",
    importance: "hard",
    input: "single_choice",
    options: ["email", "whatsapp"],
  },
  next_step: {
    field: "next_step",
    prompt: "O que faz mais sentido como próximo passo?",
    importance: "hard",
    input: "single_choice",
    options: ["commercial_conversation", "receive_materials", "follow_up_later"],
  },
  phone: {
    field: "phone",
    prompt: "Qual é o seu WhatsApp com DDD para o próximo passo combinado?",
    importance: "hard",
    input: "phone",
  },
});

export const QUALIFICATION_QUESTIONS = QUESTIONS;

function clean(value) {
  return String(value ?? "").trim();
}

function comparable(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && clean(value) !== "";
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeMode(value) {
  return comparable(value) === "outbound" ? "outbound" : "inbound";
}

function normalizeScope(value) {
  const normalized = comparable(value);
  if (/^(individual|pessoal|para mim|eu|pessoa fisica)$/.test(normalized)) return "individual";
  if (/(minha carreira|meu trabalho|uso pessoal)/.test(normalized)) return "individual";
  if (
    /(organization|organizacao|institucional|empresa|escola|colegio|universidade|faculdade|governo|orgao publico)/.test(
      normalized,
    ) ||
    /\b(minha|meu|nossa|nosso)\s+(equipe|time)\b/.test(normalized)
  ) {
    return "organization";
  }
  return normalized;
}

function normalizeOrganizationType(value) {
  const normalized = comparable(value);
  if (
    /(escola|colegio|universidade|faculdade|centro universitario|instituicao de ensino|educacao basica|ensino superior)/.test(
      normalized,
    )
  ) {
    return "school";
  }
  if (/(governo|orgao publico|prefeitura|secretaria|autarquia|ministerio)/.test(normalized)) return "government";
  if (/(empresa|companhia|negocio|startup|corporacao)/.test(normalized)) return "company";
  if (/(outro|ong|associacao|fundacao)/.test(normalized)) return "other";
  return normalized;
}

function normalizeSchoolType(value) {
  const normalized = comparable(value);
  if (/(particular|privad)/.test(normalized)) return "private";
  if (/(public|estadual|municipal|federal)/.test(normalized)) return "public";
  return normalized;
}

function normalizeSchoolLevel(value) {
  const normalized = comparable(value)
    .replace(/[ªº°]/g, "")
    .replace(/[.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";
  if (/^(nenhum|nenhuma|nao atende|none)$/.test(normalized)) return "none";
  if (/^(9|9o|nono)( ano)?$/.test(normalized)) return "9_ano";
  if (/^(1|1a|primeira)( serie)?( do ensino medio)?$/.test(normalized)) return "ensino_medio_1";
  if (/^(2|2a|segunda)( serie)?( do ensino medio)?$/.test(normalized)) return "ensino_medio_2";
  if (/^(3|3a|terceira)( serie)?( do ensino medio)?$/.test(normalized)) return "ensino_medio_3";
  if (normalized.includes("ensino medio")) return "ensino_medio";
  if (normalized.includes("fundamental ii") || normalized.includes("anos finais")) return "fundamental_ii";
  if (normalized.includes("fundamental i") || normalized.includes("anos iniciais")) return "fundamental_i";
  if (normalized.includes("infantil")) return "educacao_infantil";
  return normalized.replace(/\s+/g, "_");
}

function normalizeSchoolLevels(value) {
  const values = Array.isArray(value)
    ? value
    : clean(value).split(/\s*(?:,|;|\/|\be\b)\s*/i);
  return uniq(values.map(normalizeSchoolLevel));
}

function hasEligibleSchoolLevel(value) {
  return normalizeSchoolLevels(value).some(
    (level) => level === "9_ano" || level === "ensino_medio" || level.startsWith("ensino_medio_"),
  );
}

function isOperationalNeed(value) {
  return /(assistente|automat|process|atendimento|matricula|backoffice|governanca|roadmap|estrateg|operacao|administrativ)/.test(
    comparable(value),
  );
}

function schoolAudienceIntent(fields = {}) {
  const explicit = comparable(fields.school_initiative_type);
  if (["students", "professionals", "processes"].includes(explicit)) return explicit;
  const context = comparable(`${fields.need || ""} ${fields.education_audience || ""}`);
  const mentionsProcesses = isOperationalNeed(context);
  const mentionsStudents = /(alun|estudant|discente|jovens|9\s*(?:o|ano)|ensino medio|familia|matricula)/.test(context);
  const mentionsProfessionals = /(professor|docente|educador|coorden|diretor|gestor|lideranca|equipe pedagog|colaborador)/.test(
    context,
  );
  const inferredIntents = [
    mentionsProcesses && "processes",
    mentionsStudents && "students",
    mentionsProfessionals && "professionals",
  ].filter(Boolean);
  if (inferredIntents.length === 1) return inferredIntents[0];
  return "unknown";
}

function isTrainingNeed(value) {
  return /(trein|capacit|formacao|workshop|curso|trilha de aprendizagem)/.test(comparable(value));
}

function normalizeNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  const matched = clean(value).replace(/\./g, "").match(/\d+/);
  return matched ? Number(matched[0]) : "";
}

function normalizePreferredContact(value) {
  const normalized = comparable(value);
  if (normalized.includes("whats")) return "whatsapp";
  if (normalized.includes("mail")) return "email";
  if (/(telefone|ligacao|phone)/.test(normalized)) return "phone";
  return normalized;
}

function normalizeEmail(value) {
  const normalized = clean(value)
    .toLowerCase()
    .replace(/\s+(?:arroba|at)\s+/g, "@")
    .replace(/\s+(?:ponto|dot)\s+/g, ".")
    .replace(/\s+/g, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function normalizePhone(value) {
  const digits = clean(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return `+${digits}`;
  return "";
}

function normalizeReputation(value) {
  const normalized = comparable(value);
  if (["high", "alta"].includes(normalized)) return "alta";
  if (["medium", "media"].includes(normalized)) return "media";
  if (["low", "baixa"].includes(normalized)) return "baixa";
  if (["not_evaluated", "nao_avaliada"].includes(normalized)) return "nao_avaliada";
  return normalized || "nao_avaliada";
}

function normalizeSchoolInitiativeType(value) {
  const normalized = comparable(value);
  if (/(alun|estudant|discente|jovens)/.test(normalized)) return "students";
  if (/(professor|docente|educador|profission|equipe pedagog)/.test(normalized)) return "professionals";
  if (/(process|operacao|administr|gestao|atendimento|automat)/.test(normalized)) return "processes";
  return normalized;
}

function normalizeNextStep(value) {
  const normalized = comparable(value);
  if (/(convers|reuniao|falar com|time comercial|especialista)/.test(normalized)) return "commercial_conversation";
  if (/(material|brochura|apresentacao|conteudo)/.test(normalized)) return "receive_materials";
  if (/(depois|mais tarde|retomar|avaliar primeiro)/.test(normalized)) return "follow_up_later";
  return normalized;
}

function nextActionFromStep(value) {
  const step = normalizeNextStep(value);
  if (step === "commercial_conversation") return "conversa_comercial_solicitada";
  if (step === "receive_materials") return "enviar_materiais_solicitados";
  if (step === "follow_up_later") return "retomar_contato_posteriormente";
  return "";
}

function isLeiaPriceIntent(value) {
  const normalized = comparable(value);
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return compact.includes("leia") && /(preco|valor|investimento|custo|quanto)/.test(normalized);
}

function normalizeFieldValue(field, value) {
  if (field === "scope") return normalizeScope(value);
  if (field === "organization_type") return normalizeOrganizationType(value);
  if (field === "school_type") return normalizeSchoolType(value);
  if (field === "school_initiative_type") return normalizeSchoolInitiativeType(value);
  if (field === "school_levels") return normalizeSchoolLevels(value);
  if (field === "eligible_students") return normalizeNumber(value);
  if (field === "people_impacted") return typeof value === "number" ? value : clean(value);
  if (field === "uf") return normalizeUf(value);
  if (field === "preferred_contact") return normalizePreferredContact(value);
  if (field === "next_step") return normalizeNextStep(value);
  if (field === "reputacao_escola") return normalizeReputation(value);
  if (field === "email") return normalizeEmail(value);
  if (field === "phone") return normalizePhone(value);
  if (field === "target_year") {
    const year = clean(value).match(/20\d{2}/)?.[0];
    return year ? Number(year) : clean(value);
  }
  if (field === "cluster") return comparable(value);
  return typeof value === "string" ? clean(value) : value;
}

function normalizeFields(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields).map(([field, value]) => [field, normalizeFieldValue(field, value)]),
  );
}

function inferOrganizationTypeFromText(value) {
  const normalized = normalizeOrganizationType(value);
  return ["school", "company", "government", "other"].includes(normalized) ? normalized : "";
}

export function classifyCluster(fields = {}) {
  const explicit = comparable(fields.cluster);
  if (["individual", "school", "company", "government", "organization", "unknown"].includes(explicit)) {
    return explicit;
  }

  if (normalizeScope(fields.scope) === "individual") return "individual";

  const organizationType = normalizeOrganizationType(fields.organization_type);
  if (["school", "company", "government"].includes(organizationType)) return organizationType;
  if (organizationType === "other") return "organization";

  if (hasValue(fields.school_type) || hasValue(fields.school_levels)) return "school";
  return "unknown";
}

export function resolveProductRoute(fields = {}, cluster = classifyCluster(fields)) {
  if (cluster === "individual") return "b2c";
  if (cluster === "government") {
    const need = comparable(fields.need);
    if (isOperationalNeed(need)) return "consulting";
    return isTrainingNeed(need) || /(alun|estudant|professor|docente|servidor|aprendiz)/.test(need)
      ? "education_b2g"
      : "consulting";
  }

  if (cluster === "school") {
    const schoolType = normalizeSchoolType(fields.school_type);
    const initiativeType = schoolAudienceIntent(fields);
    if (initiativeType === "processes") return "consulting";
    if (schoolType === "public" && initiativeType !== "unknown") return "education_b2g";
    if (schoolType === "private" && initiativeType === "professionals") return "education_b2b";
    if (schoolType === "private" && initiativeType === "students" && hasEligibleSchoolLevel(fields.school_levels)) {
      return "leia";
    }
    return "unknown";
  }

  if (cluster === "company") {
    if (isTrainingNeed(fields.need)) return "education_b2b";
    return "consulting";
  }

  if (cluster === "organization") {
    if (isTrainingNeed(fields.need)) return "education_b2b";
    return "consulting";
  }

  return "unknown";
}

function questionSequence(state) {
  const { fields } = state;
  const cluster = classifyCluster(fields);
  const organizationInvolved =
    ["school", "company", "government", "organization"].includes(cluster) ||
    normalizeScope(fields.scope) === "organization";
  const sequence = ["need", "name"];

  if (cluster === "unknown") {
    sequence.push("scope");
    if (normalizeScope(fields.scope) === "organization") sequence.push("organization_type");
  }

  if (organizationInvolved) {
    sequence.push("organization_name", "website");
  }

  if (cluster === "school") {
    sequence.push("school_type");
    const schoolType = normalizeSchoolType(fields.school_type);
    const initiativeType = schoolAudienceIntent(fields);
    if (["private", "public"].includes(schoolType) && initiativeType === "unknown") {
      sequence.push("school_initiative_type");
    }
    const schoolRoute = resolveProductRoute(fields, cluster);
    if (initiativeType === "processes") {
      sequence.push("business_area", "people_impacted", "ai_stage");
    } else if (initiativeType === "professionals") {
      sequence.push("education_audience", "people_impacted");
    } else if (initiativeType === "students" && schoolType === "private") {
      sequence.push("school_levels");
      if (hasEligibleSchoolLevel(fields.school_levels)) {
        sequence.push("eligible_students", "tuition_band");
      } else if (hasValue(fields.school_levels)) {
        sequence.push("education_audience", "people_impacted");
      }
    } else if (initiativeType === "students" && schoolType === "public") {
      sequence.push("education_audience", "people_impacted");
    }
    if (initiativeType !== "unknown") {
      sequence.push("contact_role");
      if (schoolRoute === "leia") sequence.push("target_year");
      else sequence.push("timeline");
      sequence.push("uf");
    }
  } else if (cluster === "company" || cluster === "organization") {
    sequence.push("business_area", "people_impacted", "ai_stage", "contact_role", "timeline", "uf");
  } else if (cluster === "government") {
    sequence.push(
      "government_level",
      "government_audience",
      "people_impacted",
      "ai_stage",
      "contact_role",
      "timeline",
      "uf",
    );
  } else if (cluster === "individual") {
    sequence.push("experience_level", "timeline");
  } else if (organizationInvolved) {
    sequence.push("business_area", "people_impacted", "contact_role", "timeline", "uf");
  }

  if (cluster !== "unknown" || organizationInvolved) {
    sequence.push("next_step");
    sequence.push("preferred_contact");
    if (normalizePreferredContact(fields.preferred_contact) === "email") sequence.push("email");
    if (normalizePreferredContact(fields.preferred_contact) === "whatsapp") sequence.push("phone");
  }

  return uniq(sequence);
}

function questionWithRuntimeMetadata(state, field) {
  const definition = QUESTIONS[field];
  const route = resolveProductRoute(state.fields);
  let importance = definition.importance;
  if (field === "contact_role" && route === "leia") importance = "hard";
  if (field === "school_type" && schoolAudienceIntent(state.fields) === "processes") {
    importance = "medium";
  }
  const attempts = Number(state.attempts?.[field] || 0);
  const contactPrompts = {
    commercial_conversation: {
      preferred_contact: "Por qual canal você prefere que o nosso time fale com você sobre essa conversa?",
      email: "Qual e-mail o nosso time deve usar para falar com você?",
      phone: "Qual WhatsApp com DDD o nosso time deve usar para falar com você?",
      known_whatsapp: "Posso usar este WhatsApp para o retorno do nosso time ou você prefere e-mail?",
    },
    receive_materials: {
      preferred_contact: "Por qual canal você prefere receber os materiais?",
      email: "Qual e-mail devo usar para enviar os materiais?",
      phone: "Qual WhatsApp com DDD devo usar para enviar os materiais?",
      known_whatsapp: "Posso enviar os materiais por este WhatsApp ou você prefere e-mail?",
    },
    follow_up_later: {
      preferred_contact: "Para combinarmos uma retomada mais adiante, qual canal você prefere?",
      email: "Qual e-mail podemos registrar para retomar este assunto mais adiante?",
      phone: "Qual WhatsApp com DDD podemos registrar para retomar este assunto mais adiante?",
      known_whatsapp: "Posso deixar este WhatsApp como canal para retomar depois ou você prefere e-mail?",
    },
  };
  const nextStep = normalizeNextStep(state.fields?.next_step);
  const purposePrompts = contactPrompts[nextStep];
  const knownWhatsapp = state.channel === "whatsapp" && hasValue(state.fields?.phone);
  let contextualPrompt =
    field === "preferred_contact" && knownWhatsapp
      ? purposePrompts?.known_whatsapp
      : purposePrompts?.[field];
  if (field === "government_audience") {
    contextualPrompt =
      route === "education_b2g"
        ? "Qual público participaria da formação ou do programa?"
        : "Quais áreas, equipes ou pessoas seriam impactadas pela iniciativa?";
  }
  if (field === "name" && isLeiaPriceIntent(state.fields?.need)) {
    contextualPrompt =
      "Na ficha L.E.I.A. v3.1 vigente, a implantação inicial é de R$ 44.900, a renovação é de R$ 41.000 e o E-book custa 12 parcelas de R$ 84 por aluno. Para eu entender o seu contexto e orientar o próximo passo, como posso te chamar?";
  }
  const prompt =
    attempts > 0 && definition.retryPrompt ? definition.retryPrompt : contextualPrompt || definition.prompt;
  return {
    ...definition,
    importance,
    id: definition.field,
    prompt,
    attempts,
    canSkip: importance !== "hard",
    skipPolicy:
      importance === "hard"
        ? "never"
        : importance === "medium"
          ? "after_confirmation"
          : "immediate",
  };
}

export function getNextQuestion(state) {
  for (const field of questionSequence(state)) {
    if (hasValue(state.fields?.[field])) continue;
    if (state.skippedFields?.includes(field)) continue;
    return questionWithRuntimeMetadata(state, field);
  }
  return null;
}

function deriveState(state) {
  const initialCluster = classifyCluster(state.fields);
  let fields =
    initialCluster === "school" && !Object.hasOwn(state.fields, "reputacao_escola")
      ? { ...state.fields, reputacao_escola: "nao_avaliada" }
      : state.fields;
  if (hasValue(fields.next_step) && !hasValue(fields.next_action)) {
    fields = { ...fields, next_action: nextActionFromStep(fields.next_step) };
  }
  const normalizedState = fields === state.fields ? state : { ...state, fields };
  const cluster = classifyCluster(fields);
  const route = resolveProductRoute(fields, cluster);
  const regionTag = mapRegionTag(fields.uf);
  const nextQuestion = getNextQuestion(normalizedState);
  return {
    ...normalizedState,
    cluster,
    route,
    regionTag,
    status: nextQuestion ? "in_progress" : "complete",
  };
}

export function createQualificationState(options = {}) {
  const input = typeof options === "string" ? { mode: options } : options;
  const state = {
    schemaVersion: QUALIFICATION_SCHEMA_VERSION,
    mode: normalizeMode(input.mode),
    channel: comparable(input.channel) || "web",
    createdAt: input.createdAt || new Date().toISOString(),
    fields: normalizeFields(input.fields),
    skippedFields: uniq(input.skippedFields || []),
    attempts: { ...(input.attempts || {}) },
    history: Array.isArray(input.history) ? [...input.history] : [],
    lastError: null,
  };
  return deriveState(state);
}

function isSkipAnswer(answer) {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && answer.skip === true) return true;
  if (answer === null || answer === undefined || clean(answer) === "") return true;
  return typeof answer === "string" && SKIP_VALUES.has(comparable(answer));
}

function unpackAnswer(answer) {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    if (Object.hasOwn(answer, "value")) return answer.value;
    if (answer.skip === true) return "skip";
  }
  return answer;
}

function answerField(answer, fallbackField) {
  if (answer && typeof answer === "object" && !Array.isArray(answer) && answer.field) return answer.field;
  return fallbackField;
}

function validateAnswer(question, value) {
  if (!hasValue(value)) return false;
  if (question.field === "scope") return ["individual", "organization"].includes(value);
  if (question.field === "organization_type") return ["school", "company", "government", "other"].includes(value);
  if (question.field === "school_type") return ["private", "public"].includes(value);
  if (question.field === "school_levels") return Array.isArray(value) && value.length > 0;
  if (question.field === "eligible_students") return typeof value === "number" && value >= 0;
  if (question.field === "uf") return /^[A-Z]{2}$/.test(value);
  if (question.field === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  if (question.field === "phone") return /^\+55\d{10,11}$/.test(value);
  if (question.field === "preferred_contact") return ["email", "whatsapp"].includes(value);
  if (question.field === "school_initiative_type") {
    return ["students", "professionals", "processes"].includes(value);
  }
  if (question.field === "next_step") {
    return ["commercial_conversation", "receive_materials", "follow_up_later"].includes(value);
  }
  return true;
}

function appendHistory(state, item) {
  return [...state.history, item];
}

function skipQuestion(state, question) {
  const attempts = Number(state.attempts?.[question.field] || 0) + 1;
  const nextAttempts = { ...state.attempts, [question.field]: attempts };

  if (question.importance === "hard") {
    return deriveState({
      ...state,
      attempts: nextAttempts,
      history: appendHistory(state, { field: question.field, action: "skip_rejected" }),
      lastError: {
        code: "hard_answer_required",
        field: question.field,
        message: "Essa informação é necessária para definir a rota correta.",
      },
    });
  }

  if (question.importance === "medium" && attempts === 1) {
    return deriveState({
      ...state,
      attempts: nextAttempts,
      history: appendHistory(state, { field: question.field, action: "skip_confirmation_requested" }),
      lastError: {
        code: "confirm_medium_skip",
        field: question.field,
        message: "A informação ajuda na qualificação, mas a conversa pode seguir se não estiver disponível.",
      },
    });
  }

  return deriveState({
    ...state,
    attempts: nextAttempts,
    skippedFields: uniq([...state.skippedFields, question.field]),
    history: appendHistory(state, { field: question.field, action: "skipped" }),
    lastError: null,
  });
}

function deriveSupplementalFields(field, rawValue) {
  const supplemental = {};
  if (field === "scope") {
    const organizationType = inferOrganizationTypeFromText(rawValue);
    if (organizationType) supplemental.organization_type = organizationType;
    const schoolType = normalizeSchoolType(rawValue);
    if (organizationType === "school" && ["private", "public"].includes(schoolType)) {
      supplemental.school_type = schoolType;
    }
  }
  if (field === "organization_type") {
    const organizationType = inferOrganizationTypeFromText(rawValue);
    if (organizationType) supplemental.organization_type = organizationType;
    const schoolType = normalizeSchoolType(rawValue);
    if (organizationType === "school" && ["private", "public"].includes(schoolType)) {
      supplemental.school_type = schoolType;
    }
  }
  if (field === "next_step") supplemental.next_action = nextActionFromStep(rawValue);
  return supplemental;
}

function normalizeContextualAnswer(state, question, rawValue) {
  const knownWhatsapp = state.channel === "whatsapp" && hasValue(state.fields?.phone);
  if (question.field === "preferred_contact" && knownWhatsapp) {
    const explicitChannel = normalizePreferredContact(rawValue);
    if (["email", "whatsapp"].includes(explicitChannel)) return rawValue;
    const normalized = comparable(rawValue);
    if (/^(sim|pode|claro|ok|okay|isso|por aqui|aqui mesmo)(\b|$)/.test(normalized)) {
      return "whatsapp";
    }
  }
  return rawValue;
}

/**
 * Records exactly one answer: the answer to `getNextQuestion(state)`.
 * The state is immutable; a new derived state is returned every time.
 */
export function advanceQualification(state, answer) {
  const question = getNextQuestion(state);
  if (!question) return deriveState({ ...state, lastError: null });

  const suppliedField = answerField(answer, question.field);
  if (suppliedField !== question.field) {
    throw new Error(`Expected an answer for "${question.field}", received "${suppliedField}".`);
  }

  if (isSkipAnswer(answer) || isSkipAnswer(unpackAnswer(answer))) return skipQuestion(state, question);

  const rawValue = unpackAnswer(answer);
  const contextualValue = normalizeContextualAnswer(state, question, rawValue);
  const normalizedValue = normalizeFieldValue(question.field, contextualValue);
  if (!validateAnswer(question, normalizedValue)) {
    return deriveState({
      ...state,
      attempts: { ...state.attempts, [question.field]: Number(state.attempts?.[question.field] || 0) + 1 },
      history: appendHistory(state, { field: question.field, action: "invalid_answer" }),
      lastError: {
        code: "invalid_answer",
        field: question.field,
        message: "Não consegui reconhecer essa resposta. Tente novamente.",
      },
    });
  }

  const fields = {
    ...state.fields,
    [question.field]: normalizedValue,
    ...deriveSupplementalFields(question.field, rawValue),
  };

  return deriveState({
    ...state,
    fields,
    history: appendHistory(state, { field: question.field, action: "answered", value: normalizedValue }),
    lastError: null,
  });
}

export function getApplicableQuestionFields(state) {
  return questionSequence(state);
}

export function evaluateQualification(state) {
  const derived = deriveState(state);
  const applicableFields = getApplicableQuestionFields(derived);
  const completeness = calculateCompleteness(derived.fields, applicableFields);
  const leiaQualification = derived.route === "leia";
  const gates = leiaQualification
    ? evaluateLeiaGates(derived.fields)
    : {
        applicable: false,
        passed: false,
        status: "not_applicable",
        blockingFields: [],
        failedChecks: [],
        checks: [],
      };

  const score = leiaQualification
    ? {
        ...scoreLeiaQualification(derived.fields, { referenceDate: derived.createdAt }),
        completeness,
      }
    : emptyQualificationScore(completeness);

  const unansweredHardFields = applicableFields.filter((field) => {
    const question = questionWithRuntimeMetadata(derived, field);
    return question.importance === "hard" && !hasValue(derived.fields[field]);
  });

  const handoffBlockers = [];
  if (derived.route === "unknown") handoffBlockers.push("route_unknown");
  if (unansweredHardFields.length > 0) handoffBlockers.push("hard_fields_missing");
  if (!hasValue(derived.fields.name)) handoffBlockers.push("name_missing");
  if (!hasValue(derived.fields.email) && !hasValue(derived.fields.phone)) handoffBlockers.push("contact_channel_missing");
  if (["school", "company", "government", "organization"].includes(derived.cluster)) {
    if (!hasValue(derived.fields.organization_name)) handoffBlockers.push("organization_name_missing");
    if (!hasValue(derived.fields.uf)) handoffBlockers.push("uf_missing");
    if (derived.fields.next_step !== "commercial_conversation") {
      handoffBlockers.push("sales_next_step_not_selected");
    }
  }
  if (derived.route === "leia") {
    if (!gates.passed) handoffBlockers.push("leia_gates_not_passed");
    if (!hasValue(derived.fields.contact_role)) handoffBlockers.push("leia_contact_role_missing");
  }

  return {
    schemaVersion: QUALIFICATION_SCHEMA_VERSION,
    mode: derived.mode,
    cluster: derived.cluster,
    route: derived.route,
    regionTag: derived.regionTag,
    status: derived.status,
    fields: { ...derived.fields },
    skippedFields: [...derived.skippedFields],
    nextQuestion: getNextQuestion(derived),
    gates,
    score,
    modelVersion: score.modelVersion,
    accountScore: score.accountScore ?? score.icpScore,
    icpScore: score.icpScore,
    opportunityScore: score.opportunityScore,
    total: score.total,
    completeness,
    evidence: score.evidence,
    handoff: {
      ready: handoffBlockers.length === 0,
      blockers: uniq(handoffBlockers),
      missingHardFields: unansweredHardFields,
    },
  };
}

