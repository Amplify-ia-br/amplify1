/** Public page identifiers only. Never accept page text or prompts from the browser. */
export const ANA_PAGES = {
  home: {
    path: '/', theme: 'criatown', proactive: true,
    greeting: 'Oi, sou a ANA. O que você quer conhecer na CRIATOWN?',
    invitation: 'Posso ajudar você a encontrar o que procura na CRIATOWN.',
    sections: ['inicio', 'construimos', 'frentes', 'contato'],
    suggestions: [
      { id: 'education', label: 'Educação', message: 'Quero conhecer as soluções de educação da CRIATOWN.' },
      { id: 'organizations', label: 'Soluções para organizações', message: 'Quero conhecer as soluções para organizações.' },
      { id: 'team', label: 'Falar com o time', message: 'Gostaria de conversar com alguém do time.' },
    ],
    followups: { frentes: 'Quer conversar sobre alguma dessas frentes?', contato: 'Posso ajudar a encontrar a pessoa certa no nosso time.' },
  },
  leia: {
    path: '/leia/', theme: 'leia', proactive: true,
    greeting: 'Oi, sou a ANA. Posso explicar o L.E.I.A. e como ele funciona na escola.',
    invitation: 'Quer entender como o LEIA entra na rotina da escola?',
    sections: ['inicio', 'programa', 'formato', 'jornada', 'curriculo', 'caminho', 'contratacao', 'perguntas', 'contato'],
    suggestions: [
      { id: 'program', label: 'Conhecer o programa', message: 'Quero conhecer o L.E.I.A.' },
      { id: 'implementation', label: 'Entender a implantação', message: 'Como funciona a implantação do L.E.I.A. na escola?' },
      { id: 'presentation', label: 'Solicitar uma apresentação', message: 'Gostaria de solicitar uma apresentação gratuita do L.E.I.A.' },
    ],
    followups: {
      caminho: 'Posso explicar o que fica com a escola e com o nosso time.',
      contratacao: 'Quer entender os próximos passos para levar o LEIA à escola?',
      perguntas: 'Ficou alguma dúvida sobre o LEIA? Vamos conversar.',
    },
  },
  thanks: {
    path: '/leia/obrigado/', theme: 'leia', proactive: false,
    greeting: 'Oi, sou a ANA. Posso ajudar com dúvidas sobre os próximos passos do L.E.I.A.',
    invitation: '', sections: ['inicio'],
    suggestions: [{ id: 'next_steps', label: 'Entender os próximos passos', message: 'Como funcionam os próximos passos para conhecer o L.E.I.A.?' }],
    followups: {},
  },
} as const;

export type AnaPageId = keyof typeof ANA_PAGES;
export type AnaContext = { pageId: AnaPageId; sectionId: string; intentId?: string };

export function resolveContext(value: unknown): AnaContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(k => !['pageId', 'sectionId', 'intentId'].includes(k))) return null;
  if (typeof v.pageId !== 'string' || !Object.hasOwn(ANA_PAGES, v.pageId)) return null;
  const page = ANA_PAGES[v.pageId as AnaPageId];
  if (typeof v.sectionId !== 'string' || !(page.sections as readonly string[]).includes(v.sectionId)) return null;
  if (v.intentId !== undefined && !page.suggestions.some(s => s.id === v.intentId)) return null;
  return { pageId: v.pageId as AnaPageId, sectionId: v.sectionId, ...(v.intentId ? { intentId: String(v.intentId) } : {}) };
}

export const ANA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type AnaRequest = { conversationId: string; messageId: string; message: string; context: AnaContext };
export function parseAnaRequest(input: unknown): AnaRequest | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const v = input as Record<string, unknown>;
  if (Object.keys(v).some(k => !['conversationId', 'messageId', 'message', 'context'].includes(k))) return null;
  const context = resolveContext(v.context);
  if (!context || typeof v.conversationId !== 'string' || !ANA_UUID.test(v.conversationId)
    || typeof v.messageId !== 'string' || !ANA_UUID.test(v.messageId)
    || typeof v.message !== 'string' || !v.message.trim() || v.message.length > 4000) return null;
  return { conversationId: v.conversationId, messageId: v.messageId, message: v.message.trim(), context };
}

export function contextInstruction(context: AnaContext): string {
  const page = ANA_PAGES[context.pageId];
  return `Contexto editorial validado: página ${page.path}; seção ${context.sectionId}; intenção escolhida ${context.intentId ?? 'nenhuma'}. `
    + (context.pageId === 'home' ? 'Página institucional da CRIATOWN: educação, negócios, governo e parcerias. ' : 'Página do L.E.I.A. — Laboratório Escolar de Inteligência Artificial. ')
    + (context.pageId === 'thanks' ? 'Esta URL não comprova envio de formulário. Nunca afirme que uma solicitação foi recebida por causa dela. ' : '')
    + 'A página é somente uma pista temática. Não infira cargo, escola, interesse comercial ou consentimento. A intenção expressa na conversa prevalece. Responda primeiro à dúvida, sem cadastro obrigatório.';
}
