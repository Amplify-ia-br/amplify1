export const LEIA_SCORE_VERSION = "leia-v1.1.0";
export const GENERIC_SCORE_VERSION = "ana-qualification-v1.0.0";

function clean(value) {
  return String(value ?? "").trim();
}

function comparable(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function asFiniteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const matched = clean(value).replace(/\./g, "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!matched) return null;
  const number = Number(matched[0]);
  return Number.isFinite(number) ? number : null;
}

function asBrazilianCurrency(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = comparable(value);
  const thousands = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/);
  if (thousands) {
    const number = Number(thousands[1].replace(",", "."));
    return Number.isFinite(number) ? number * 1_000 : null;
  }
  return asFiniteNumber(value);
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && clean(value) !== "";
}

function normalizedLevels(value) {
  const values = Array.isArray(value) ? value : hasValue(value) ? [value] : [];
  return values.map(comparable).filter(Boolean);
}

function normalizedSchoolType(value) {
  const schoolType = comparable(value);
  if (/(particular|privad)/.test(schoolType)) return "private";
  if (/(public|estadual|municipal|federal)/.test(schoolType)) return "public";
  return schoolType;
}

function hasEligibleLeiaLevel(value) {
  return normalizedLevels(value).some((level) => {
    const normalized = level.replace(/[ªº°]/g, "");
    return (
      normalized === "9_ano" ||
      normalized === "ensino_medio" ||
      normalized.startsWith("ensino_medio_") ||
      /(?:^|\b)(?:9|nono)(?:o)?\s*(?:ano)?(?:\b|$)/.test(normalized) ||
      normalized.includes("ensino medio")
    );
  });
}

export function evaluateLeiaGates(fields = {}) {
  const schoolType = normalizedSchoolType(fields.school_type);
  const levels = normalizedLevels(fields.school_levels);
  const schoolTypeKnown = schoolType === "private" || schoolType === "public";
  const schoolLevelsKnown = levels.length > 0;
  const isPrivateSchool = schoolType === "private";
  const hasEligibleLevels = schoolLevelsKnown && hasEligibleLeiaLevel(levels);

  const checks = [
    {
      id: "private_school",
      field: "school_type",
      status: !schoolTypeKnown ? "pending" : isPrivateSchool ? "passed" : "failed",
      reason: !schoolTypeKnown
        ? "Tipo de escola ainda não informado."
        : isPrivateSchool
          ? "Escola particular."
          : "Escola pública segue para a rota de educação B2G.",
    },
    {
      id: "eligible_school_levels",
      field: "school_levels",
      status: !schoolLevelsKnown ? "pending" : hasEligibleLevels ? "passed" : "failed",
      reason: !schoolLevelsKnown
        ? "Etapas de ensino ainda não informadas."
        : hasEligibleLevels
          ? "A escola atende ao 9º ano e/ou Ensino Médio."
          : "As etapas informadas não pertencem ao público atual do L.E.I.A.",
    },
  ];

  const blockingFields = checks.filter((check) => check.status === "pending").map((check) => check.field);
  const failedChecks = checks.filter((check) => check.status === "failed").map((check) => check.id);

  return {
    applicable: true,
    passed: checks.every((check) => check.status === "passed"),
    status: blockingFields.length > 0 ? "pending" : failedChecks.length > 0 ? "failed" : "passed",
    blockingFields,
    failedChecks,
    checks,
  };
}

function scoreEligibleStudents(value) {
  const students = asFiniteNumber(value);
  if (students === null) return { points: 0, reason: "Quantidade de alunos elegíveis não informada." };
  if (students >= 200) return { points: 25, reason: `${students} alunos elegíveis (faixa prioritária).` };
  if (students >= 150) return { points: 18, reason: `${students} alunos elegíveis.` };
  if (students >= 100) return { points: 12, reason: `${students} alunos elegíveis.` };
  if (students >= 50) return { points: 6, reason: `${students} alunos elegíveis.` };
  return { points: 0, reason: `${students} alunos elegíveis (abaixo da faixa pontuada).` };
}

function scoreTuition(value) {
  const band = comparable(value).replace(/\s+/g, "_");
  const knownBands = {
    above_2000: 20,
    acima_de_2000: 20,
    "2000_plus": 20,
    from_1500_to_1999: 14,
    "1500_1999": 14,
    from_1000_to_1499: 8,
    "1000_1499": 8,
    below_1000: 4,
    abaixo_de_1000: 4,
  };

  if (Object.hasOwn(knownBands, band)) {
    return { points: knownBands[band], reason: `Faixa de mensalidade: ${clean(value)}.` };
  }

  const monthlyValue = asBrazilianCurrency(value);
  if (monthlyValue === null) return { points: 0, reason: "Faixa de mensalidade não informada." };
  if (monthlyValue >= 2000) return { points: 20, reason: `Mensalidade aproximada de R$ ${monthlyValue}.` };
  if (monthlyValue >= 1500) return { points: 14, reason: `Mensalidade aproximada de R$ ${monthlyValue}.` };
  if (monthlyValue >= 1000) return { points: 8, reason: `Mensalidade aproximada de R$ ${monthlyValue}.` };
  return { points: 4, reason: `Mensalidade aproximada de R$ ${monthlyValue}.` };
}

function scoreReputation(value) {
  const reputation = comparable(value);
  if (["high", "alta"].includes(reputation)) return { points: 15, reason: "Reputação da escola avaliada como alta." };
  if (["medium", "media"].includes(reputation)) return { points: 8, reason: "Reputação da escola avaliada como média." };
  if (["low", "baixa"].includes(reputation)) return { points: 3, reason: "Reputação da escola avaliada como baixa." };
  return { points: 0, reason: "Reputação da escola ainda não avaliada internamente." };
}

function scoreContactRole(value) {
  const role = comparable(value);
  if (!role) return { points: 0, reason: "Papel do contato não informado." };

  const selfReportsRole = (rolePattern) => {
    const attribution = "(?:(?:eu\\s+)?(?:sou|atuo\\s+como|trabalho\\s+como|ocupo\\s+o\\s+cargo\\s+de)\\s+)?(?:o\\s+|a\\s+)?";
    return (
      new RegExp(`^${attribution}(?:${rolePattern})\\b`).test(role) ||
      new RegExp(`\\b(?:eu\\s+)?(?:sou|atuo\\s+como|trabalho\\s+como|ocupo\\s+o\\s+cargo\\s+de)\\s+(?:o\\s+|a\\s+)?(?:${rolePattern})\\b`).test(
        role,
      )
    );
  };

  const explicitlyOutsideDecision =
    /\b(?:nao\s+(?:participo|decido|aprovo|influencio)|nao\s+(?:tenho\s+)?(?:autonomia|poder|acesso|influencia)|nao\s+sou\s+(?:decisor|responsavel)|sem\s+(?:autonomia|poder|participacao|acesso)|fora\s+da\s+decisao|(?:so|apenas)\s+(?:apoio|acompanho|repasso|pesquiso))\b/.test(
      role,
    );
  if (explicitlyOutsideDecision) {
    return { points: 0, reason: "O contato informou que não participa nem influencia a decisão." };
  }

  if (
    selfReportsRole(
      "mantenedor(?:a)?|proprietari[oa]|fundador(?:a)?|diretor(?:a)?(?:\\s+geral)?|diretoria|presidente|soci[oa]",
    )
  ) {
    return { points: 15, reason: "Contato com poder de decisão ou patrocínio." };
  }
  if (
    /\b(?:participo|membro)\b.*\b(?:decisao|comite)\b|\b(?:recomendo|avalio)\b.*\b(?:solucao|fornecedor|proposta)\b/.test(
      role,
    )
  ) {
    return { points: 11, reason: "Contato influenciador com potencial de acesso à decisão." };
  }

  if (selfReportsRole("assistente|auxiliar|estagiari[oa]|alun[oa]|estudante|professor(?:a)?|docente")) {
    return { points: 0, reason: "O papel informado não evidencia autoridade ou influência na decisão." };
  }

  if (selfReportsRole("coordenador(?:a)?|pedagog[oa]|especialista|gestor(?:a)?|gerente|lider|responsavel")) {
    return { points: 11, reason: "Contato influenciador com potencial de acesso à decisão." };
  }

  return { points: 0, reason: "O papel foi informado, mas não há evidência de autoridade ou influência na decisão." };
}

function scoreNeed(value) {
  const need = comparable(value);
  if (!need) return { points: 0, reason: "Necessidade ainda não descrita." };

  const lowIntent =
    /\b(?:sem\s+(?:interesse|demanda|necessidade)|nao\s+(?:temos|ha|existe)\s+(?:interesse|demanda|necessidade)|nao\s+(?:queremos|pretendemos|planejamos|vamos)\s+(?:criar|oferecer|implantar|implementar|adotar|levar|usar|contratar)|(?:so|apenas)\s+(?:estou|estamos)?\s*(?:pesquisando|olhando|conhecendo|curios[oa]s?))\b/.test(
      need,
    );
  if (lowIntent) {
    return { points: 0, reason: "A resposta indica curiosidade ou ausência de uma necessidade ativa." };
  }

  const mentionsLeia = /\bl\.?e\.?i\.?a\.?\b/.test(need);
  const mentionsAi = /\b(?:ia|inteligencia artificial|ia generativa|chatgpt)\b/.test(need);
  const mentionsStudents =
    /\b(?:alun[oa]s?|estudantes?|jovens?|adolescentes?|9\s*(?:º|o|ano)|nono ano|ensino medio)\b/.test(need);
  const mentionsProgram =
    /\b(?:programa|iniciativa|curso|formacao|formar|capacitar|ensinar|letramento|trilha|curriculo|projeto|implantar|implementar|oferecer|lancar)\b/.test(
      need,
    );
  const mentionsOutcomeOrProblem =
    /\b(?:aprendizagem|competencias?|preparar|uso responsavel|pensamento critico|engajamento|evasao|dificuldade|desafio|problema|atrair|captar|reter|rematricula|receita|diferencial|posicionamento)\b/.test(
      need,
    );

  if (mentionsLeia || (mentionsStudents && mentionsAi && (mentionsProgram || mentionsOutcomeOrProblem))) {
    return { points: 10, reason: "Necessidade clara e aderente ao L.E.I.A., com público e iniciativa ou problema identificados." };
  }
  if (mentionsStudents && [mentionsAi, mentionsProgram, mentionsOutcomeOrProblem].filter(Boolean).length >= 1) {
    return { points: 6, reason: "Há sinal de aderência ao L.E.I.A., mas a necessidade ainda precisa de mais contexto." };
  }

  return { points: 0, reason: "A resposta não evidencia uma necessidade aderente ao L.E.I.A." };
}

function scoreTargetYear(value, referenceDate) {
  const normalized = comparable(value).replace(/\s+/g, "_");
  if (["now", "agora", "this_year", "este_ano", "next_year", "proximo_ano", "within_12_months"].includes(normalized)) {
    return { points: 10, reason: "Janela de decisão em até 12 meses." };
  }

  const targetYear = asFiniteNumber(value);
  if (targetYear === null) return { points: 0, reason: "Ano de interesse não informado." };

  const date = new Date(referenceDate || Date.now());
  const referenceYear = Number.isNaN(date.getTime()) ? new Date().getUTCFullYear() : date.getUTCFullYear();
  if (targetYear < referenceYear) {
    return { points: 0, reason: `Ano ${targetYear} já passou; prazo precisa ser confirmado.` };
  }
  if (targetYear <= referenceYear + 1) return { points: 10, reason: `Interesse para ${targetYear}.` };
  if (targetYear === referenceYear + 2) return { points: 6, reason: `Interesse para ${targetYear}.` };
  return { points: 3, reason: `Interesse para ${targetYear}, em horizonte mais distante.` };
}

function scoreNextAction(fields) {
  const nextAction = comparable(fields.next_action);
  if (fields.meeting_requested === true || /(conversa_comercial|reuniao|diagnostico|agenda)/.test(nextAction)) {
    return { points: 5, reason: "Há uma conversa comercial ou reunião solicitada." };
  }
  if (/(enviar_materiais|material)/.test(nextAction)) {
    return { points: 3, reason: "O envio de materiais foi combinado como próximo passo." };
  }
  if (/(retomar_contato|posteriormente)/.test(nextAction)) {
    return { points: 1, reason: "Foi combinado retomar o contato mais adiante." };
  }
  if (nextAction) return { points: 3, reason: "Há uma próxima ação registrada, ainda sem reunião confirmada." };

  const engagement = comparable(fields.engagement_status);
  if (["high", "alto", "interested", "interessado"].includes(engagement)) {
    return { points: 3, reason: "O lead demonstrou interesse, mas ainda não há próxima ação definida." };
  }
  return { points: 0, reason: "Próxima ação ou engajamento ainda não confirmados." };
}

function evidenceItem(dimension, criterion, maxPoints, result, value) {
  return {
    dimension,
    criterion,
    points: clamp(result.points, 0, maxPoints),
    maxPoints,
    value: hasValue(value) ? value : null,
    reason: result.reason,
  };
}

/**
 * Scores a school account and its current opportunity independently from
 * L.E.I.A. eligibility. Consumers must inspect `evaluateLeiaGates` as well.
 */
export function scoreLeiaQualification(fields = {}, options = {}) {
  const evidence = [
    evidenceItem("account", "eligible_students", 25, scoreEligibleStudents(fields.eligible_students), fields.eligible_students),
    evidenceItem("account", "tuition_band", 20, scoreTuition(fields.tuition_band), fields.tuition_band),
    evidenceItem("account", "reputacao_escola", 15, scoreReputation(fields.reputacao_escola), fields.reputacao_escola),
    evidenceItem("opportunity", "contact_role", 15, scoreContactRole(fields.contact_role), fields.contact_role),
    evidenceItem("opportunity", "need", 10, scoreNeed(fields.need), fields.need),
    evidenceItem(
      "opportunity",
      "target_year",
      10,
      scoreTargetYear(fields.target_year, options.referenceDate),
      fields.target_year,
    ),
    evidenceItem("opportunity", "next_action", 5, scoreNextAction(fields), fields.next_action || fields.engagement_status),
  ];

  const accountScore = evidence
    .filter((item) => item.dimension === "account")
    .reduce((total, item) => total + item.points, 0);
  const opportunityScore = evidence
    .filter((item) => item.dimension === "opportunity")
    .reduce((total, item) => total + item.points, 0);

  return {
    modelVersion: LEIA_SCORE_VERSION,
    accountScore,
    // Compatibility alias for consumers created before account_score became canonical.
    icpScore: accountScore,
    opportunityScore,
    total: clamp(accountScore + opportunityScore, 0, 100),
    evidence,
  };
}

export function calculateCompleteness(fields = {}, applicableFields = []) {
  const uniqueFields = [...new Set(applicableFields)];
  if (uniqueFields.length === 0) return 0;
  const completed = uniqueFields.filter((field) => hasValue(fields[field])).length;
  return Math.round((completed / uniqueFields.length) * 100);
}

export function emptyQualificationScore(completeness = 0) {
  return {
    modelVersion: GENERIC_SCORE_VERSION,
    accountScore: 0,
    icpScore: 0,
    opportunityScore: 0,
    total: 0,
    completeness,
    evidence: [],
  };
}

