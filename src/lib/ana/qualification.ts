import { normalizeKnowledgeText } from "../okf/core.js";
import type { AnaLeadQualification, AnaNextQuestion } from "./conversation.js";

// Part of the existing controller's qualification object, not another memory.
export const commercialQuestions = {
  organization: "Qual é a sua empresa ou organização?",
  organizationContext: "O que a sua organização faz?",
  businessChallenge: "O que motivou a procura por ajuda com IA?",
  audience: "Qual área ou público está envolvido?",
  currentAiUse: "Como vocês usam IA atualmente?",
  desiredOutcome: "Qual resultado vocês esperam alcançar?",
  mainConstraint: "Qual é a principal restrição hoje?",
  timeline: "Quando vocês gostariam de começar?",
  decisionProcess: "Como funciona a decisão de contratação?",
} as const;
export type CommercialField = keyof typeof commercialQuestions;
export type QualificationField = CommercialField | "name" | "grades" | "students" | "internet" | "need";
export type QualificationAnswer = { status: "provided" | "unknown" | "declined"; answer: string; sourceText?: string; legacy?: true };
export type QualificationAnswers = Partial<Record<QualificationField, QualificationAnswer>>;
export const commercialFields = Object.keys(commercialQuestions) as CommercialField[];

export function unavailableAnswer(value: string): "unknown" | "declined" | undefined {
  const text = normalizeKnowledgeText(value);
  if (/\b(?:prefiro nao|nao (?:quero|posso|vou) (?:informar|responder|dizer|compartilhar))\b/.test(text)) return "declined";
  if (/\b(?:nao (?:sei|sabemos)|nao tenho (?:essa )?(?:visao|visoa|clareza)|ainda nao (?:defini|decidi|decidimos|definimos)|nao esta definido)\b/.test(text)) return "unknown";
  return undefined;
}

export function qualificationQuestion(value: string): QualificationField | undefined {
  // Only actual questions, not facts in the assistant's preceding explanation.
  const text = normalizeKnowledgeText(value.replace(/L\.E\.I\.A\./gi, "LEIA").match(/[^.!?\n]+\?/g)?.join(" ") ?? "");
  if (/nome|como.*cham/.test(text) && !/empresa|organizacao|escola|escritorio/.test(text)) return "name";
  if (/(?:o que|atividade|atua|ramo).*(?:organizacao|empresa|escritorio)|(?:organizacao|empresa).*(?:faz|atua|atividade)/.test(text)) return "organizationContext";
  if (/(?:qual|nome|chama).*(?:empresa|organizacao|escritorio)|escola.*chama/.test(text)) return "organization";
  if (/9.*ano|ensino medio|series|faixa escolar/.test(text)) return "grades";
  if (/quantos.*(?:estudantes|alunos)|numero.*(?:alunos|estudantes)/.test(text)) return "students";
  if (/internet|conexao/.test(text)) return "internet";
  if (/quando|qual.*prazo/.test(text)) return "timeline";
  if (/(?:decisao|decide|aprova|contratacao)/.test(text)) return "decisionProcess";
  if (/restricao|limitacao|limite|impedimento/.test(text)) return "mainConstraint";
  if (/resultado|esperam alcancar/.test(text)) return "desiredOutcome";
  if (/usa.*ia|uso.*ia|ia.*atualmente|ja.*ia/.test(text)) return "currentAiUse";
  if (/(?:area|publico).*(?:envolvid|atendid)|quem.*envolvid/.test(text)) return "audience";
  if (/problema|processo|desafio|motivou/.test(text)) return "businessChallenge";
  if (/necessidade|gostaria.*(?:melhorar|resolver)/.test(text)) return "need";
  return undefined;
}

function explicitUnavailableField(text: string): QualificationField | undefined {
  const subjects: Array<[QualificationField, RegExp]> = [
    ["timeline", /\b(?:prazo|quando|comecar|iniciar)\b/],
    ["organizationContext", /\b(?:atividade|ramo|o que.*faz)\b/],
    ["organization", /\b(?:empresa|organizacao|escritorio|nome da escola)\b/],
    ["currentAiUse", /\b(?:uso|usam|usamos|utilizam|utilizamos)\b.*\bia\b/],
    ["desiredOutcome", /\b(?:resultado|objetivo)\b/],
    ["mainConstraint", /\b(?:restricao|limitacao)\b/],
    ["decisionProcess", /\b(?:decide|decisao|contratacao|aprova)\b/],
    ["audience", /\b(?:publico|area envolvida)\b/],
    ["internet", /\b(?:internet|conexao)\b/],
    ["students", /\b(?:quantos|quantidade)\b.*\b(?:alunos|estudantes)\b/],
    ["grades", /\b(?:series|faixa escolar|ensino medio|9.*ano)\b/],
  ];
  return subjects.find(([, pattern]) => pattern.test(text))?.[0];
}

const explicitPatterns: Partial<Record<CommercialField, RegExp>> = {
  timeline: /(?:\b(?:queremos|desejamos|pretendemos) (?:come[çc]ar|iniciar) [^.!?\n]+|^(?:(?:ainda|no|na|este|esse|pr[óo]ximo|pr[óo]xima)\s+)*(?:m[êe]s que vem|m[êe]s|semana|semestre|trimestre|ano|hoje|amanh[ãa])(?:\s+(?:que vem|pr[óo]ximo|pr[óo]xima))?[.! ]*$)/iu,
  organization: /\b(?:(?:minha|nossa|a|meu|nosso|o) (?:empresa|escola|organiza[çc][ãa]o|escrit[óo]rio) (?:se chama|chama-se|é)|escola chamada)\s+([^,.!?\n]+)/iu,
  organizationContext: /\b(?:somos|tenho|temos|trabalho em|(?:dono|dona|propriet[áa]ri[oa]) de) (?:um |uma )?(?:escrit[óo]rio|escola|col[ée]gio|empresa|cl[íi]nica|ind[úu]stria|loja|ag[êe]ncia|hospital|restaurante)[^.!?\n]*|\b(?:atuamos|trabalhamos) (?:com|no|na|em) [^.!?\n]+/iu,
  audience: /\b(?:a |nossa )?[áa]rea (?:envolvida |afetada )?[ée] [^.!?\n]+|\b(?:p[úu]blico|equipe) (?:envolvid[oa]|atendid[oa]) [ée] [^.!?\n]+/iu,
  currentAiUse: /\b(?:atualmente |hoje |ainda |j[áa] )?(?:n[ãa]o )?(?:usamos|utilizamos|utilizo|uso) [^.!?\n]*(?:\bIA\b|intelig[êe]ncia artificial|ChatGPT)[^.!?\n]*/iu,
  desiredOutcome: /\b(?:queremos|quero|buscamos|esperamos|precisamos) (?:reduzir|diminuir|melhorar|aumentar|descobrir|identificar|encontrar|mapear)[^.!?\n]*|\b(?:resultado|objetivo) (?:desejado |esperado )?[ée] [^.!?\n]+/iu,
  mainConstraint: /\b(?:nossa |a )?(?:principal )?(?:restri[çc][ãa]o|limita[çc][ãa]o) [ée] [^.!?\n]+|\b(?:n[ãa]o temos|estamos sem|temos pouco) (?:or[çc]amento|tempo|equipe)[^.!?\n]*/iu,
  decisionProcess: /\b(?:eu|meu s[óo]cio|a diretoria|o diretor|a diretora|o conselho|n[óo]s) (?:decido|decide|decidimos|aprova|aprovamos)[^.!?\n]*|\b(?:a |nossa )?contrata[çc][ãa]o (?:passa|depende|[ée])[^.!?\n]*/iu,
};

export function collectQualificationAnswers(
  turns: Array<{ answer: string; question: string }>,
  qualification: AnaLeadQualification,
  legacyDeferred?: AnaNextQuestion["key"][],
): AnaLeadQualification {
  const answers: QualificationAnswers = { ...qualification.answers };
  // Read legacy facts as facts, not as proof of a complete interview.
  const legacy: Partial<Record<QualificationField, string | number | boolean>> = {
    name: qualification.name, organization: qualification.organization,
    businessChallenge: qualification.businessChallenge, timeline: qualification.timeline,
    need: qualification.need, grades: qualification.gradeFit,
    students: qualification.studentCount, internet: qualification.internetReady,
    audience: qualification.businessAreas?.length ? qualification.businessAreas.join(", ") : undefined,
    desiredOutcome: qualification.objectives?.length ? qualification.objectives.join("; ") : undefined,
  };
  for (const [key, value] of Object.entries(legacy)) {
    const field = key as QualificationField;
    if (value !== undefined && !answers[field]) {
      const source = [...turns].reverse().find(turn => typeof value === "string" && turn.answer.includes(value));
      answers[field] = { status: "provided", answer: String(value), ...(source ? { sourceText: source.answer.slice(0, 1000) } : {}) };
    }
  }
  for (const key of legacyDeferred ?? []) {
    if ((key === "timeline" || key === "businessChallenge") && !answers[key]) {
      // Old snapshots cannot distinguish unknown from declined. Never fabricate
      // a verbatim answer or turn this unavailability into a known field value.
      answers[key] = { status: "unknown", answer: "Resposta indisponível no registro anterior.", legacy: true };
    }
  }
  for (const { answer, question } of turns) {
    const text = normalizeKnowledgeText(answer);
    const status = unavailableAnswer(answer);
    const asked = qualificationQuestion(question);
    const unavailableField = status ? explicitUnavailableField(text) : undefined;
    const matched = new Set<CommercialField>();
    // Reuse typed facts extracted by the controller, adding their response
    // provenance. Later confirmations replace an earlier unknown answer.
    const typedEvidence: Partial<Record<QualificationField, RegExp>> = {
      name: /\b(?:meu nome|me cham[oa]|sou (?:o|a))\b/,
      grades: /9.*ano|ensino medio|educacao infantil|fundamental i/,
      students: /\b\d+\s*(?:alunos|estudantes)\b/,
      internet: /\binternet\b|\bconexao\b/,
    };
    if (!status && !answer.includes("?")) {
      for (const [key, pattern] of Object.entries(typedEvidence)) {
        const field = key as QualificationField;
        if (legacy[field] !== undefined && (pattern.test(text) || asked === field)) {
          answers[field] = { status: "provided", answer: String(legacy[field]), sourceText: answer.slice(0, 1000) };
        }
      }
    }
    for (const [key, pattern] of Object.entries(explicitPatterns)) {
      const match = answer.match(pattern);
      if (!match || unavailableAnswer(match[0]) || match[0].includes("?")) continue;
      const field = key as CommercialField;
      const value = (field === "organization" ? match[1] : match[0]).trim().slice(0, 500);
      if (unavailableAnswer(value)) continue;
      if (field === "organization" && /^(?:um|uma|pequena|grande|particular|privada|publica)\b/.test(normalizeKnowledgeText(value))) continue;
      answers[field] = { status: "provided", answer: value, sourceText: answer.trim().slice(0, 1000) };
      if (field === "organization") qualification.organization = value;
      matched.add(field);
    }
    const changesTopic = /prioridades?/.test(text) && asked !== "desiredOutcome"
      || /(?:as tres|os dois|ambos|ambas).*(?:junt|objetiv|prioritar)|(?:trabalhar|tratar).*(?:juntos|juntas)/.test(text)
      || matched.size > 0 && asked && !matched.has(asked as CommercialField);
    if (status && (unavailableField || asked && !changesTopic)) {
      answers[unavailableField ?? asked!] = { status, answer: answer.trim().slice(0, 500) };
      continue;
    }
    // Open commercial fields accept the user's own wording; unrelated requests,
    // acknowledgements and explicitly labelled answers to other fields do not.
    if (asked && asked in commercialQuestions && !status && !changesTopic && !answer.includes("?")
      && (!/^(?:sim|nao|ok|certo|entendi|obrigad[oa]|ambos|as tres juntas)[.! ]*$/.test(text) || asked === "currentAiUse" && /^(?:sim|nao)[.! ]*$/.test(text))
      && !/\b(?:quero saber|me explique|como funciona)\b/.test(text)
      && answer.trim().length >= 2) {
      if (asked !== "timeline" || /\b(?:mes|semana|ano|hoje|amanha|agora|semestre|trimestre|janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/.test(text)) {
        answers[asked] = { status: "provided", answer: answer.trim().slice(0, 500) };
        if (asked === "organization") qualification.organization = answer.trim().replace(/[.!]+$/, "");
      }
    }
    // A later explicit timeline supersedes an earlier unknown/declined answer.
    if (/\b(?:comecar|iniciar|prazo)\b/.test(text) && !status && qualification.timeline && answer.includes(qualification.timeline)) {
      answers.timeline = { status: "provided", answer: qualification.timeline };
    }
  }
  if (qualification.needs?.includes("students")) {
    const purpose = turns.find(({ answer }) => /\b(?:ensinar|ensino de|aprendizado|aprender)\b.*\bia\b/.test(normalizeKnowledgeText(answer)));
    if (purpose) {
      answers.businessChallenge ??= { status: "provided", answer: purpose.answer.slice(0, 500) };
      answers.audience ??= { status: "provided", answer: "estudantes", sourceText: purpose.answer.slice(0, 1000) };
      answers.desiredOutcome ??= { status: "provided", answer: purpose.answer.slice(0, 500) };
    }
  }
  if (qualification.businessChallenge && !answers.desiredOutcome && /diagnostico/.test(normalizeKnowledgeText(qualification.businessChallenge))) {
    const purpose = turns.find(({ answer }) => /\b(?:descobrir|identificar|mapear|encontrar)\b/.test(normalizeKnowledgeText(answer)));
    if (purpose) answers.desiredOutcome = { status: "provided", answer: purpose.answer.slice(0, 500) };
  }
  for (const field of ["timeline", "businessChallenge"] as const) {
    if (answers[field]?.status === "provided") qualification[field] = answers[field].answer;
    else if (answers[field]) qualification[field] = undefined;
  }
  return { ...qualification, answers };
}

export function isOrganizationalOpportunity(q: AnaLeadQualification) {
  return Boolean(q.organizationalOpportunity || q.organization || q.answers?.organizationContext || q.offerInterests?.some(offer => offer !== "academy") || q.multiOfferInterest);
}

export function commercialInterviewComplete(q: AnaLeadQualification) {
  return !isOrganizationalOpportunity(q) || commercialFields.every(key => Boolean(q.answers?.[key]));
}

export function commercialFacts(q: AnaLeadQualification, pending = false) {
  return Object.entries(q.answers ?? {}).filter(([, value]) => pending ? value.status !== "provided" : value.status === "provided")
    .map(([field, value]) => `${field}: ${value.legacy ? "indisponível no histórico legado" : value.status === "unknown" ? "não sabe" : value.status === "declined" ? "preferiu não informar" : "informado"} — ${value.answer}`);
}

export function realizesQuestion(key: AnaNextQuestion["key"], text: string) {
  if (key === "name" && !text.includes("?")) return true; // optional identity
  const questions = normalizeKnowledgeText(text.replace(/L\.E\.I\.A\./gi, "LEIA").match(/[^.!?\n]+\?/g)?.join(" ") ?? "");
  const patterns: Record<AnaNextQuestion["key"], RegExp> = {
    name: /nome|chama/, need: /precisa|necessidade|ajudar|busca|resolver|melhorar/,
    grades: /serie|9.*ano|ensino medio|faixa/, students: /quantos|quantidade|numero.*(?:alunos|estudantes)/,
    internet: /internet|conexao/, businessChallenge: /desafio|processo|gestao|negocio|operacao|melhorar|resolver|motivou/,
    timeline: /quando|prazo|comecar|iniciar/, priority: /prioridade|prioritaria|primeiro|duas frentes|ambas|foco/,
    contactConsent: /(?:quer|posso|autoriza|podemos|gostaria).*(?:contato|time|equipe)/,
    contact: /e-?mail|whatsapp|telefone|celular|canal/,
    organization: /(?:qual|nome|chama).*(?:empresa|organizacao|escola|escritorio)/,
    organizationContext: /(?:empresa|organizacao).*(?:faz|atua|atividade)|atividade|ramo|atuam/,
    audience: /area|publico|quem.*envolvid/, currentAiUse: /usa.*ia|uso.*ia|ia.*atualmente|ja.*ia/,
    desiredOutcome: /resultado|esperam alcancar/, mainConstraint: /restricao|limitacao|limite|impedimento/,
    decisionProcess: /decisao|decide|aprova|contratacao/,
  };
  return patterns[key].test(questions);
}
