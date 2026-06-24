function clean(value) {
  return String(value || "").trim();
}

function normalizeSource(source) {
  return clean(source) || "unknown";
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textQualityScore(value) {
  const text = clean(value);
  if (text.length >= 80) return 10;
  if (text.length >= 30) return 5;
  if (text.length > 0) return 2;
  return 0;
}

function getStage(totalScore) {
  if (totalScore >= 90) return "oportunidade";
  if (totalScore >= 68) return "lead_quente";
  if (totalScore >= 44) return "lead_qualificado";
  if (totalScore >= 20) return "lead_em_descoberta";
  return "lead_frio";
}

function scoreNexialista(payload) {
  const tags = ["source_nexialista"];
  const reasons = [];
  let fitScore = 0;
  let intentScore = 0;
  let maturityScore = 0;
  let engagementScore = 0;
  const eventName = clean(payload.eventName || payload.event_name);

  const eventTagByName = {
    nexialista_checkout_started: "checkout_iniciado",
    nexialista_payment_completed: "pagamento_concluido",
    nexialista_payment_abandoned: "pagamento_abandonado",
    nexialista_free_access_granted: "acesso_gratuito_liberado",
    nexialista_ebook_downloaded: "ebook_baixado",
    nexialista_diagnosis_requested: "diagnostico_solicitado",
  };

  if (eventTagByName[eventName]) {
    tags.push(eventTagByName[eventName]);
  }

  const role = clean(payload.role);
  if (["CEO / Founder", "C-level", "Diretoria"].includes(role)) {
    fitScore += 18;
    tags.push("decision_maker");
    reasons.push("cargo com alta influência");
  } else if (role === "Gerente" || role === "Média gestão") {
    fitScore += 11;
    tags.push("manager");
  } else if (role) {
    fitScore += 5;
  }

  const companySize = clean(payload.companySize);
  if (["51-200", "201-500", "501-1000", "50-200", "200-800"].includes(companySize)) {
    fitScore += 18;
    tags.push("empresa_icp");
    reasons.push("organização com escala para aplicação");
  } else if (["11-50", "1001-5000", "20-59", "1000+"].includes(companySize)) {
    fitScore += 12;
    tags.push("empresa_proxima_icp");
  } else if (["5001-10000", "10001+", "800+"].includes(companySize)) {
    fitScore += 10;
    tags.push("empresa_grande_nao_icp");
  } else if (companySize === "1-10") {
    fitScore += 4;
  } else if (["self-employed", "ate-50"].includes(companySize)) {
    fitScore += 2;
  }

  const segment = clean(payload.segment);
  if (["Serviços", "Indústria", "Educação", "Saúde", "Construção / engenharia"].includes(segment)) {
    fitScore += 10;
    tags.push("segmento_prioritario");
  } else if (segment) {
    fitScore += 4;
  }

  const challengeScore = textQualityScore(payload.businessChallenge);
  const nextStepScore = textQualityScore(payload.aiNextStep);
  intentScore += challengeScore + nextStepScore;
  if (challengeScore >= 10) {
    tags.push("desafio_claro");
    reasons.push("descreveu desafio de negócio com contexto");
  }
  if (nextStepScore >= 10) tags.push("proximo_passo_claro");

  const diagnosisInterest = clean(payload.diagnosisInterest);
  if (diagnosisInterest === "sim") {
    intentScore += 7;
    tags.push("quer_diagnostico");
    reasons.push("pediu diagnóstico com a Amplify");
  } else if (diagnosisInterest === "talvez") {
    intentScore += 3;
    tags.push("interesse_diagnostico_medio");
  }

  const aiUsage = clean(payload.aiUsage);
  if (["Projetos estruturados em andamento", "IA integrada a processos críticos"].includes(aiUsage)) {
    maturityScore += 14;
    tags.push("ia_estruturada");
  } else if (["Uso individual informal", "Algumas ferramentas em áreas específicas"].includes(aiUsage)) {
    maturityScore += 8;
    tags.push("ia_em_uso");
  } else if (aiUsage) {
    maturityScore += 3;
    tags.push("ia_inicial");
  }

  const aiMaturity = clean(payload.aiMaturity);
  if (["Implementando", "Escalando"].includes(aiMaturity)) maturityScore += 12;
  else if (aiMaturity === "Testando") maturityScore += 6;
  else if (aiMaturity) maturityScore += 3;

  const aiInvestment = clean(payload.aiInvestment);
  if (["R$ 50 mil a R$ 200 mil", "Acima de R$ 200 mil"].includes(aiInvestment)) {
    maturityScore += 10;
    tags.push("investimento_ia_relevante");
  } else if (["Até R$ 10 mil", "R$ 10 mil a R$ 50 mil"].includes(aiInvestment)) {
    maturityScore += 5;
  }

  const aiConsulting = clean(payload.aiConsulting).toLowerCase();
  if (aiConsulting.includes("acima") || aiConsulting.includes("r$ 20 mil a")) maturityScore += 6;
  else if (aiConsulting.includes("até")) maturityScore += 3;

  const completedStep = Number(payload.completedStep || 0);
  const formStatus = clean(payload.formStatus);
  const isFormCompletion = !eventName || formStatus === "completed" || eventName === "nexialista_form_completed";

  if (formStatus === "in_progress") {
    engagementScore += Math.min(18, completedStep * 3);
    tags.push("form_iniciado");
  } else if (isFormCompletion) {
    engagementScore += 5;
    tags.push("form_concluido");
    reasons.push("concluiu diagnóstico");
  }

  if (eventName === "nexialista_checkout_started") engagementScore += 8;
  if (eventName === "nexialista_payment_completed") {
    intentScore += 18;
    engagementScore += 12;
    reasons.push("concluiu pagamento do e-book");
  }
  if (eventName === "nexialista_free_access_granted") {
    engagementScore += 10;
    tags.push("ebook_liberado_gratis");
  }
  if (eventName === "nexialista_ebook_downloaded") {
    engagementScore += 12;
    reasons.push("baixou o e-book");
  }
  if (eventName === "nexialista_diagnosis_requested") {
    intentScore += 18;
    tags.push("quer_diagnostico");
    reasons.push("solicitou diagnóstico com a Amplify");
  }

  const result = payload.result || {};
  if (Number(result.score || 0) >= 80) tags.push("nexialista_alto_potencial");
  else if (Number(result.score || 0) >= 60) tags.push("nexialista_potencial");

  const totalScore = clampScore(fitScore + intentScore + maturityScore + engagementScore);

  return {
    source: "nexialista",
    totalScore,
    fitScore: clampScore(fitScore),
    intentScore: clampScore(intentScore),
    maturityScore: clampScore(maturityScore),
    engagementScore: clampScore(engagementScore),
    leadStage: getStage(totalScore),
    tags: uniq(tags),
    scoreReason: reasons.length ? reasons.join("; ") : "Pontuação calculada a partir dos dados disponíveis.",
  };
}

function scoreGeneric(payload, source) {
  const tags = [`source_${source}`];
  let fitScore = 0;
  let intentScore = 0;
  let maturityScore = 0;
  let engagementScore = 5;
  const reasons = [];
  const eventName = clean(payload.eventName || payload.event_name);

  if (clean(payload.email)) engagementScore += 5;
  if (clean(payload.phone)) engagementScore += 5;
  if (clean(payload.company)) fitScore += 8;
  if (clean(payload.role)) fitScore += 8;
  if (clean(payload.companySize || payload.company_size)) fitScore += 5;
  if (clean(payload.teamSize || payload.team_size)) fitScore += 7;
  if (clean(payload.intent)) intentScore += 7;
  if (clean(payload.interestArea || payload.interest_area)) intentScore += 5;
  if (clean(payload.message || payload.businessChallenge || payload.aiNextStep)) {
    intentScore += textQualityScore(payload.message || payload.businessChallenge || payload.aiNextStep);
    reasons.push("deixou contexto textual");
  }

  if (source === "bootcamp") {
    const bootcampTagByEvent = {
      bootcamp_interest_captured: "bootcamp_interesse",
      bootcamp_program_requested: "bootcamp_programa_solicitado",
      bootcamp_checkout_clicked: "bootcamp_checkout_clicado",
      bootcamp_checkout_started: "bootcamp_checkout_iniciado",
      bootcamp_corporate_lead: "bootcamp_corporativo",
      bootcamp_sponsor_lead: "bootcamp_patrocinio",
      bootcamp_waitlist_joined: "bootcamp_lista_espera",
      bootcamp_order_approved: "bootcamp_pedido_aprovado",
      bootcamp_participant_confirmed: "bootcamp_participante_confirmado",
      bootcamp_attended: "bootcamp_compareceu",
      bootcamp_missed: "bootcamp_nao_compareceu",
    };

    if (bootcampTagByEvent[eventName]) tags.push(bootcampTagByEvent[eventName]);
    if (eventName === "bootcamp_program_requested") engagementScore += 8;
    if (eventName === "bootcamp_interest_captured") engagementScore += 6;
    if (eventName === "bootcamp_checkout_clicked" || eventName === "bootcamp_checkout_started") {
      intentScore += 16;
      engagementScore += 8;
      reasons.push("demonstrou intenção de compra");
    }
    if (eventName === "bootcamp_corporate_lead") {
      fitScore += 18;
      intentScore += 12;
      reasons.push("solicitou conversa corporativa");
    }
    if (eventName === "bootcamp_sponsor_lead") {
      fitScore += 14;
      intentScore += 12;
      reasons.push("solicitou conversa de patrocínio");
    }
    if (eventName === "bootcamp_waitlist_joined") {
      intentScore += 10;
      reasons.push("entrou na lista de espera");
    }
    if (eventName === "bootcamp_order_approved" || eventName === "bootcamp_participant_confirmed") {
      intentScore += 28;
      engagementScore += 18;
      reasons.push("compra ou participação confirmada");
    }
    if (eventName === "bootcamp_attended") engagementScore += 22;
  }

  const totalScore = clampScore(fitScore + intentScore + maturityScore + engagementScore);

  return {
    source,
    totalScore,
    fitScore: clampScore(fitScore),
    intentScore: clampScore(intentScore),
    maturityScore: clampScore(maturityScore),
    engagementScore: clampScore(engagementScore),
    leadStage: getStage(totalScore),
    tags: uniq(tags),
    scoreReason: reasons.length ? reasons.join("; ") : "Pontuação parcial calculada a partir dos dados enviados.",
  };
}

export function scoreLead(payload = {}, options = {}) {
  const source = normalizeSource(options.source || payload.source || payload.origin || "unknown");

  if (source === "nexialista") {
    return scoreNexialista(payload);
  }

  return scoreGeneric(payload, source);
}
