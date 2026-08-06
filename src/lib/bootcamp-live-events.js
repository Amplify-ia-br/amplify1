const ADRIANO_WHATSAPP_NUMBER = "5511950350002";

export const BOOTCAMP_LIVE_EVENTS = [
  {
    slug: "live-crc-rn-11-08-26",
    bootcampSlug: "crc-rn-25-08-26",
    partnerKey: "crc-rn",
    partnerShortName: "CRC-RN",
    partnerName: "CRC-RN",
    partnerDescriptor: "Conselho Regional de Contabilidade do RN",
    partnerLogoSrc: "/bootcamp/crc-rn/logo-crc-rn-white.png",
    dateLabel: "11 de agosto de 2026",
    timeLabel: "19h",
    title: "Sua empresa está preparada para a nova economia movida por Inteligência Artificial?",
    subtitle:
      "Uma conversa prática para empresários, contadores e escritórios contábeis entenderem onde a IA já muda produtividade, atendimento, documentos, rotinas fiscais e gestão.",
    audienceLabel: "Negócios contábeis",
    sectorTitle: "IA para escritórios, rotinas fiscais, atendimento e gestão contábil.",
    sectorCopy:
      "A live prepara o terreno para decisões mais concretas: onde a IA pode reduzir retrabalho, organizar documentos, apoiar comunicação com clientes e criar padrões de produtividade sem abrir mão de critério profissional.",
    bootcampTitle: "Bootcamp IA para Negócios Contábeis",
    bootcampDateLabel: "25 de agosto de 2026",
    bootcampHref: "/agenda/crc-rn-25-08-26",
    entryPoint: "live_crc_rn_11_08",
    sourceCta: "entrar_grupo_live_crc",
    whatsappNumber: ADRIANO_WHATSAPP_NUMBER,
    keyPoints: [
      "Como a IA já muda a rotina de escritórios contábeis e departamentos financeiros.",
      "Onde usar IA com responsabilidade em documentos, atendimento, fiscal e gestão.",
      "Como sair da curiosidade e transformar IA em método de trabalho para equipes.",
    ],
    useCases: [
      "Atendimento e comunicação com clientes",
      "Síntese e revisão de documentos",
      "Rotinas fiscais, financeiras e de departamento pessoal",
      "Gestão de pendências, prazos e prioridades",
    ],
    faq: [
      {
        question: "A live é gratuita?",
        answer: "Sim. A participação na live é gratuita, com entrada pelo grupo de WhatsApp dos participantes.",
      },
      {
        question: "Preciso conhecer IA ou programação?",
        answer: "Não. A conversa será prática e pensada para profissionais contábeis e gestores que precisam entender aplicações reais.",
      },
      {
        question: "Qual é a relação com o Bootcamp?",
        answer:
          "A live é uma porta de entrada. O Bootcamp presencial aprofunda o método com exercícios, casos de uso e aplicação prática.",
      },
    ],
  },
  {
    slug: "live-crea-rn-12-08-26",
    bootcampSlug: "crea-rn-24-08-26",
    partnerKey: "crea-rn",
    partnerShortName: "CREA-RN",
    partnerName: "CREA-RN",
    partnerDescriptor: "Conselho Regional de Engenharia e Agronomia do RN",
    partnerLogoSrc: "/bootcamp/crea-rn/logo-hub-crea-horizontal.png",
    dateLabel: "12 de agosto de 2026",
    timeLabel: "19h",
    title: "Sua empresa está preparada para a nova economia movida por Inteligência Artificial?",
    subtitle:
      "Uma conversa prática para engenheiros, empresas técnicas e lideranças entenderem onde a IA já muda projetos, relatórios, propostas, documentação e produtividade profissional.",
    audienceLabel: "Engenharia e empresas técnicas",
    sectorTitle: "IA para projetos, relatórios, propostas, operação e responsabilidade técnica.",
    sectorCopy:
      "A live mostra onde a IA pode apoiar a produtividade técnica sem substituir julgamento profissional: organização de contexto, documentação, planejamento, comunicação e tomada de decisão com método.",
    bootcampTitle: "Bootcamp Engineering AI Experience Natal",
    bootcampDateLabel: "24 de agosto de 2026",
    bootcampHref: "/agenda/crea-rn-24-08-26",
    entryPoint: "live_crea_rn_12_08",
    sourceCta: "entrar_grupo_live_crea",
    whatsappNumber: ADRIANO_WHATSAPP_NUMBER,
    keyPoints: [
      "Como a IA já muda o trabalho de engenheiros, empresas técnicas e equipes de projeto.",
      "Onde aplicar IA em relatórios, propostas, planejamento e comunicação com clientes.",
      "Como levar IA para a rotina profissional preservando responsabilidade técnica.",
    ],
    useCases: [
      "Relatórios técnicos e documentação",
      "Propostas, orçamentos e comunicação com clientes",
      "Planejamento, acompanhamento e gestão de pendências",
      "Organização de referências, normas e contexto de projeto",
    ],
    faq: [
      {
        question: "A live é gratuita?",
        answer: "Sim. A participação na live é gratuita, com entrada pelo grupo de WhatsApp dos participantes.",
      },
      {
        question: "Preciso saber programar?",
        answer: "Não. A conversa será aplicada ao uso profissional de IA, mesmo para quem não tem formação técnica em programação.",
      },
      {
        question: "Qual é a relação com o Bootcamp?",
        answer:
          "A live apresenta o tema e prepara os participantes. O Bootcamp presencial aprofunda o método com prática orientada.",
      },
    ],
  },
];

function clean(value) {
  return String(value || "").trim();
}

export function getBootcampLiveBySlug(slug) {
  const cleanSlug = clean(slug).toLowerCase();
  return BOOTCAMP_LIVE_EVENTS.find((event) => event.slug === cleanSlug) || null;
}
