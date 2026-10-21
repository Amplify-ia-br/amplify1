const STORAGE_KEY = "amplify:ana:qualification:v1";
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{12,128}$/;
const SENSITIVE_SPEECH_FIELDS = new Set(["name", "email", "phone"]);

const OPTION_LABELS = {
  individual: "É para mim",
  organization: "Envolve uma organização",
  company: "Empresa",
  school: "Instituição de ensino",
  government: "Órgão público",
  other: "Outro tipo de organização",
  private: "Particular",
  public: "Pública",
  exploring: "Explorando possibilidades",
  testing: "Fazendo testes",
  implementing: "Implantando",
  scaling: "Escalando o uso",
  municipal: "Municipal",
  state: "Estadual",
  federal: "Federal",
  beginner: "Iniciante",
  intermediate: "Intermediária",
  advanced: "Avançada",
  now: "Agora",
  within_3_months: "Nos próximos 3 meses",
  within_6_months: "Nos próximos 6 meses",
  later: "Mais adiante",
  undefined: "Ainda não definimos",
  email: "E-mail",
  whatsapp: "WhatsApp",
  students: "Estudantes",
  professionals: "Profissionais da educação",
  processes: "Processos da instituição",
  commercial_conversation: "Conversar com o time",
  receive_materials: "Receber materiais primeiro",
  follow_up_later: "Avaliar e retomar depois",
  below_1000: "Abaixo de R$ 1 mil",
  from_1000_to_1499: "De R$ 1 mil a R$ 1.499",
  from_1500_to_1999: "De R$ 1.500 a R$ 1.999",
  above_2000: "R$ 2 mil ou mais",
};

const INPUT_HINTS = {
  email: "seu@email.com",
  phone: "(11) 99999-9999",
  url: "https://suaorganizacao.com.br",
  number: "Digite um número aproximado",
  number_or_text: "Pode ser uma estimativa",
  currency_band: "Ex.: acima de R$ 2 mil",
  state: "Ex.: SP, Bahia ou Distrito Federal",
  year: "Ex.: 2027",
  multi_choice: "Ex.: 9º ano e Ensino Médio",
};

const state = {
  sessionId: "",
  qualification: null,
  evaluation: null,
  currentQuestion: null,
  messages: [],
  lastAudioUrl: "",
  isBusy: false,
  isComplete: false,
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const page = document.querySelector(".ana-page");
const startPanel = document.querySelector("[data-start-panel]");
const startButton = document.querySelector("[data-start-button]");
const conversation = document.querySelector("[data-conversation]");
const answerForm = document.querySelector("[data-answer-form]");
const answerInput = document.querySelector("[data-answer-input]");
const choiceGrid = document.querySelector("[data-choice-grid]");
const statusEl = document.querySelector("[data-status]");
const transcriptEl = document.querySelector("[data-transcript]");
const errorEl = document.querySelector("[data-error]");
const avatar = document.querySelector("[data-avatar]");
const listenButton = document.querySelector("[data-listen-button]");
const repeatButton = document.querySelector("[data-repeat-button]");
const typeButton = document.querySelector("[data-type-button]");
const skipButton = document.querySelector("[data-skip-button]");
const retryButton = document.querySelector("[data-retry-button]");
const completion = document.querySelector("[data-completion]");
const completionText = document.querySelector("[data-completion-text]");
const phaseLabel = document.querySelector("[data-phase-label]");
const answerLabel = document.querySelector("[data-answer-label]");
let recognition = null;
let activeAudio = null;

function setPhase(phase, label) {
  page.dataset.stage = phase;
  phaseLabel.textContent = label;
  avatar.classList.toggle("is-speaking", phase === "speaking" || phase === "processing");
  avatar.classList.toggle("is-listening", phase === "listening");
}

function setError(message = "") {
  errorEl.textContent = message;
}

function setBusy(isBusy) {
  state.isBusy = isBusy;
  document.querySelectorAll("button").forEach((button) => {
    button.disabled = isBusy && button !== repeatButton;
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function restoreConversation() {
  const saved = safeJsonParse(window.localStorage.getItem(STORAGE_KEY));
  if (!saved || typeof saved !== "object") {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  state.sessionId = typeof saved.sessionId === "string" && SESSION_ID_PATTERN.test(saved.sessionId)
    ? saved.sessionId
    : "";
  // Remove dados deixados pela versao anterior. O servidor e a fonte de verdade;
  // o navegador precisa guardar somente a referencia opaca da sessao.
  if (state.sessionId) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId }));
    startButton.textContent = "Retomar conversa";
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function persistConversation() {
  if (!state.sessionId) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId }));
}

function redactContactData(value) {
  return String(value || "")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[e-mail omitido]")
    .replace(/(?<!\d)(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9[\s.-]?)?\d{4}[\s.-]?\d{4}(?!\d)/g, "[telefone omitido]");
}

function speechHistory() {
  return state.messages.slice(-16).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    field: message.field,
    content: SENSITIVE_SPEECH_FIELDS.has(message.field)
      ? "Dado pessoal informado e omitido por privacidade."
      : redactContactData(message.content),
  }));
}

function scrollQuestionIntoView() {
  if (!window.matchMedia("(max-width: 860px)").matches) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  window.requestAnimationFrame(() => statusEl.scrollIntoView({ behavior, block: "start" }));
}

function decodeHeaderText(value) {
  if (!value) return "";
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (_error) {
    return "";
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || "Não foi possível concluir esta etapa.");
    error.code = data.code;
    error.details = data;
    throw error;
  }
  return data;
}

function applyTurn(payload) {
  state.sessionId = payload.sessionId || state.sessionId;
  state.qualification = payload.state || payload.qualification || state.qualification;
  state.evaluation = payload.evaluation || null;
  state.currentQuestion = payload.question || payload.nextQuestion || state.evaluation?.nextQuestion || null;
  state.isComplete = Boolean(payload.done || state.qualification?.status === "complete") && !state.currentQuestion;
  persistConversation();
}

function questionCount() {
  return (state.qualification?.history || []).filter((item) => item.action === "answered" || item.action === "skipped").length + 1;
}

function inputType(question) {
  if (question?.input === "email") return "email";
  if (question?.input === "url") return "url";
  if (question?.input === "phone") return "tel";
  if (question?.input === "number") return "number";
  return "text";
}

function renderChoices(question) {
  choiceGrid.replaceChildren();
  const options = Array.isArray(question?.options) ? question.options : [];
  choiceGrid.hidden = options.length === 0;
  options.forEach((value) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ana-choice-button";
    button.textContent = OPTION_LABELS[value] || value;
    button.addEventListener("click", () => handleAnswer(value));
    choiceGrid.append(button);
  });
}

function renderQuestion() {
  const question = state.currentQuestion;
  if (!question) return;
  statusEl.textContent = question.prompt;
  transcriptEl.textContent = Array.isArray(question.options) && question.options.length
    ? "Responda naturalmente ou escolha uma opção abaixo."
    : "Responda naturalmente por voz ou por texto.";
  answerLabel.textContent = `Etapa ${questionCount()}`;
  answerInput.type = inputType(question);
  answerInput.inputMode = question.input === "number" ? "numeric" : "text";
  answerInput.autocomplete = question.input === "email" ? "email" : question.input === "phone" ? "tel" : "off";
  answerInput.placeholder = INPUT_HINTS[question.input] || "Digite sua resposta";
  answerInput.value = "";
  skipButton.hidden = !question.canSkip;
  renderChoices(question);
  scrollQuestionIntoView();
}

function showTextFallback(message = "") {
  answerForm.hidden = false;
  answerInput.focus();
  if (message) setError(message);
}

function hideTextFallback() {
  answerForm.hidden = true;
  answerInput.value = "";
}

function createRecognition() {
  if (!SpeechRecognition) {
    showTextFallback("Seu navegador não liberou voz agora. Pode digitar sua resposta.");
    return null;
  }
  const instance = new SpeechRecognition();
  instance.lang = "pt-BR";
  instance.interimResults = false;
  instance.maxAlternatives = 1;
  return instance;
}

function playAudio(url) {
  return new Promise((resolve) => {
    if (activeAudio) activeAudio.pause();
    activeAudio = new Audio(url);
    activeAudio.onended = resolve;
    activeAudio.onerror = resolve;
    activeAudio.play().catch(resolve);
  });
}

async function requestAnaSpeech(text, { autoListen = true, storeAssistantMessage = true } = {}) {
  setBusy(true);
  setError("");
  setPhase("processing", "Ana pensando");
  statusEl.textContent = "Ana está preparando a próxima pergunta...";

  try {
    const response = await fetch("/api/ana-speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: speechHistory(), currentQuestion: redactContactData(text) }),
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || "Não foi possível gerar a fala da Ana.");
    }

    const anaText = decodeHeaderText(response.headers.get("x-ana-text")) || text;
    const audioBlob = await response.blob();
    if (state.lastAudioUrl) URL.revokeObjectURL(state.lastAudioUrl);
    state.lastAudioUrl = URL.createObjectURL(audioBlob);
    repeatButton.hidden = false;
    statusEl.textContent = anaText;
    if (storeAssistantMessage) state.messages.push({ role: "assistant", content: anaText });
    persistConversation();

    setPhase("speaking", "Ana falando");
    await playAudio(state.lastAudioUrl);
    if (autoListen && !state.isComplete) {
      window.setTimeout(() => listenForAnswer({ automatic: true }), 280);
    } else if (!state.isComplete) {
      setPhase("ready", "Pode responder agora");
    }
  } catch (error) {
    statusEl.textContent = text;
    setPhase("ready", "Pode responder agora");
    showTextFallback(error.message || "A voz da Ana não está disponível agora. Pode seguir por texto.");
  } finally {
    setBusy(false);
  }
}

function listenForAnswer({ automatic = false } = {}) {
  if (state.isBusy || state.isComplete || !state.currentQuestion) return;
  recognition = createRecognition();
  if (!recognition) return;

  setError("");
  hideTextFallback();
  setPhase("listening", "Pode responder agora");
  transcriptEl.textContent = automatic ? "Pode responder agora." : "Estou ouvindo...";
  listenButton.disabled = true;

  recognition.onresult = async (event) => {
    listenButton.disabled = false;
    const answer = event.results[0][0].transcript.trim();
    if (!answer || answer.replace(/\s/g, "").length < 2) {
      showTextFallback("Não consegui ouvir bem. Pode repetir ou digitar sua resposta.");
      setPhase("ready", "Pode responder agora");
      return;
    }
    await handleAnswer(answer);
  };
  recognition.onerror = () => {
    listenButton.disabled = false;
    transcriptEl.textContent = "Não consegui ouvir bem.";
    showTextFallback("Seu microfone não respondeu agora. Pode digitar sua resposta.");
    setPhase("ready", "Pode responder agora");
  };
  recognition.onend = () => {
    listenButton.disabled = false;
    if (!state.isBusy && !state.isComplete && page.dataset.stage === "listening") {
      setPhase("ready", "Pode responder agora");
    }
  };
  recognition.start();
}

async function startConversation() {
  if (state.isBusy) return;
  setBusy(true);
  setError("");
  setPhase("processing", "Iniciando conversa");
  try {
    const startPayload = () => ({
      action: "start",
      sessionId: state.sessionId || undefined,
      state: state.qualification || undefined,
      channel: "web",
      mode: "inbound",
    });
    let payload;
    try {
      payload = await postJson("/api/ana-turn", startPayload());
    } catch (error) {
      if (error.code !== "session_not_found" || !state.sessionId) throw error;
      window.localStorage.removeItem(STORAGE_KEY);
      state.sessionId = "";
      state.qualification = null;
      state.evaluation = null;
      state.currentQuestion = null;
      state.messages = [];
      payload = await postJson("/api/ana-turn", startPayload());
    }
    applyTurn(payload);
    startPanel.hidden = true;
    conversation.hidden = false;
    if (state.isComplete) {
      await finishConversation();
      return;
    }
    renderQuestion();
    const opening = state.messages.length
      ? state.currentQuestion.prompt
      : `Oi, eu sou a Ana, estrategista de IA da Amplify. Vou entender seu contexto e direcionar o próximo passo. ${state.currentQuestion.prompt}`;
    await requestAnaSpeech(opening);
  } catch (error) {
    setPhase("intro", "Pronta para conversar");
    setError(error.message || "Não foi possível iniciar a conversa.");
  } finally {
    setBusy(false);
  }
}

async function handleAnswer(answer) {
  if (state.isBusy || !state.currentQuestion) return;
  if (recognition) {
    try {
      recognition.stop();
    } catch (_error) {
      // Recognition may already be stopped.
    }
  }

  const answeredQuestion = state.currentQuestion;
  hideTextFallback();
  choiceGrid.hidden = true;
  transcriptEl.textContent = typeof answer === "object" ? "Prefiro seguir sem essa informação agora." : String(answer);
  state.messages.push({
    role: "user",
    field: answeredQuestion.field,
    content: `${answeredQuestion.prompt} Resposta: ${typeof answer === "object" ? "prefiro não responder" : answer}`,
  });
  setBusy(true);
  setError("");
  setPhase("processing", "Analisando resposta");

  try {
    const payload = await postJson("/api/ana-turn", {
      action: "answer",
      sessionId: state.sessionId,
      questionId: answeredQuestion.id || answeredQuestion.field,
      answer,
      state: state.qualification,
    });
    applyTurn(payload);
    if (state.isComplete) {
      await finishConversation();
      return;
    }

    renderQuestion();
    if (state.qualification?.lastError) setError(state.qualification.lastError.message || "Revise sua resposta.");
    await requestAnaSpeech(state.currentQuestion.prompt);
  } catch (error) {
    state.messages.pop();
    setPhase("ready", "Pode tentar novamente");
    renderQuestion();
    setError(error.message || "Não consegui registrar essa resposta. Tente novamente.");
    showTextFallback();
  } finally {
    setBusy(false);
  }
}

async function finishConversation() {
  state.isComplete = true;
  state.currentQuestion = null;
  persistConversation();
  hideTextFallback();
  choiceGrid.hidden = true;
  listenButton.hidden = true;
  typeButton.hidden = true;
  skipButton.hidden = true;
  repeatButton.hidden = true;
  completion.hidden = false;
  completionText.textContent = "Qualificação concluída. Estou registrando seu contexto com segurança.";
  const finalText = "Obrigada. Já tenho o contexto necessário para preparar o próximo passo com a Amplify.";
  await requestAnaSpeech(finalText, { autoListen: false, storeAssistantMessage: false });
  await submitLead();
}

async function submitLead() {
  setBusy(true);
  retryButton.hidden = true;
  setError("");
  setPhase("processing", "Registrando contexto");
  try {
    const result = await postJson("/api/ana-lead", {
      sessionId: state.sessionId,
      state: state.qualification,
    });
    setPhase("complete", "Contexto recebido");
    const ghlResult = result.integrations?.ghl || result.handoff;
    const handedOff = ghlResult?.status === "handed_off" || ghlResult?.status === "already_handed_off";
    const individual = state.evaluation?.route === "b2c";
    const nextStep = state.qualification?.fields?.next_step;
    if (handedOff) {
      statusEl.textContent = "Tudo certo. Seu contexto foi encaminhado ao time responsável da Amplify.";
      completionText.textContent = "A equipe recebeu as informações necessárias para continuar a conversa.";
    } else if (nextStep === "receive_materials") {
      statusEl.textContent = "Tudo certo. Registramos seu contexto e o pedido de materiais.";
      completionText.textContent = "A equipe terá o canal escolhido para dar continuidade ao pedido.";
    } else if (nextStep === "follow_up_later") {
      statusEl.textContent = "Tudo certo. Seu contexto ficou registrado.";
      completionText.textContent = "Você pode retomar a conversa quando fizer sentido.";
    } else if (individual) {
      statusEl.textContent = "Tudo certo. Registramos seu interesse e vamos indicar o próximo passo mais adequado.";
      completionText.textContent = "Seu canal ficou registrado para a continuidade.";
    } else {
      statusEl.textContent = "Tudo certo. Seu contexto foi registrado para avaliação da equipe da Amplify.";
      completionText.textContent = "Seu canal ficou registrado para a continuidade.";
    }
    transcriptEl.textContent = "Conversa concluída.";
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    setPhase("attention", "Envio pendente");
    statusEl.textContent = "A qualificação foi concluída, mas o envio ao time ainda não foi confirmado.";
    completionText.textContent = "Suas respostas continuam nesta sessão. Tente o envio novamente.";
    retryButton.hidden = false;
    setError(error.message || "Não foi possível confirmar o envio.");
  } finally {
    setBusy(false);
  }
}

startButton.addEventListener("click", startConversation);
listenButton.addEventListener("click", () => listenForAnswer({ automatic: false }));
typeButton.addEventListener("click", () => showTextFallback());
skipButton.addEventListener("click", () => handleAnswer({ skip: true }));
retryButton.addEventListener("click", submitLead);
repeatButton.addEventListener("click", () => {
  if (!state.lastAudioUrl || state.isBusy) return;
  setPhase("speaking", "Ana falando");
  playAudio(state.lastAudioUrl).then(() => {
    if (!state.isComplete) setPhase("ready", "Pode responder agora");
  });
});
answerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const answer = answerInput.value.trim();
  if (!answer) {
    setError("Digite uma resposta ou escolha ‘Não sei agora’ quando essa opção estiver disponível.");
    return;
  }
  await handleAnswer(answer);
});

restoreConversation();
