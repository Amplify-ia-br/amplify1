import { describe, expect, it } from "vitest";
import { renderInvitationHtml, sanitizeAmplifyDayHtml } from "./lp-template";

const baseHtml = `<html><head></head><body>
  <aside class="hero-action" data-astro-cid-uieih2gt>Original</aside>
  <picture>
    <source srcset="/amplify-day/venue/ulysses-640.avif 640w, /amplify-day/venue/ulysses-1080.avif 1080w" type="image/avif">
    <source srcset="/amplify-day/venue/ulysses-640.webp 640w, /amplify-day/venue/ulysses-1080.webp 1080w" type="image/webp">
  </picture>
</body></html>`;

const invitation = {
  guest_name: "Maria Souza",
  guest_email: "maria@empresa.com",
  guest_company: "Empresa",
  guest_role: "CEO",
  personal_message: "Quero muito contar com sua presença.",
  code: "AMP-7K2P9Q",
  status: "visited",
  inviter: {
    name: "Ricardo Almeida",
    role: "Presidente",
    company: "LID Brasília",
    signature: "Uma assinatura longa que pertence apenas à mensagem compartilhada.",
    base_message: "Olá, {convidado}.",
  },
};

describe("Amplify Day nominal landing page", () => {
  it("prioritizes the personal invitation without exposing the raw signature", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("Maria,<br");
    expect(html).toContain("seu convite para o Ampl_IA Day by X-Via está reservado");
    expect(html).toContain("Ricardo Almeida convidou você para participar desta conversa");
    expect(html).toContain("transformação da IA na educação e no governo");
    expect(html).toContain("Evento presencial.");
    expect(html).not.toContain("Evento presencial, por convite e com vagas limitadas.");
    expect(html).toContain("Quero muito contar com sua presença.");
    expect(html).not.toContain(invitation.inviter.signature);
  });

  it("does not reuse the sharing message as landing-page copy", () => {
    const withoutPersonalMessage = {
      ...invitation,
      personal_message: null,
      inviter: { ...invitation.inviter, base_message: "Texto exclusivo de WhatsApp e email." },
    };
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation: withoutPersonalMessage }, "secure-token");

    expect(html).not.toContain("convidou você para participar desta conversa");
    expect(html).not.toContain("Texto exclusivo de WhatsApp e email.");
    expect(html).toContain("A convite de");
  });

  it("keeps the success state hidden before confirmation", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("data-invite-success hidden");
    expect(html).toContain(".nominal-confirmed[hidden]");
    expect(html).toContain("fetch('/api/amplify-day-confirm'");
    expect(html).not.toContain("fetch('/api/amplify-day/confirm'");
  });

  it("keeps the visual invitation demo self-contained without calling the confirmation API", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation: { ...invitation, preview_mode: true } }, "preview-pareamento");

    expect(html).toContain('data-preview="true"');
    expect(html).toContain("if (form.dataset.preview === 'true')");
    expect(html).toContain("data-invite-success hidden");
  });

  it("keeps long personal messages out of the first fold and exposes the complete text in a dialog", () => {
    const longMessage = "Uma mensagem pessoal mais longa, criada para validar que o convite não cresce para além da primeira tela e que o conteúdo completo continua acessível quando a pessoa quiser ler.";
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation: { ...invitation, personal_message: longMessage } }, "secure-token");

    expect(html).toContain("Ler mensagem completa");
    expect(html).toContain("data-message-dialog");
    expect(html).toContain("messageDialog?.showModal()");
    expect(html).toContain("overflow:hidden;padding:");
    expect(html).toContain("-webkit-line-clamp:3");
  });

  it("does not add a redundant message dialog for short notes", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation }, "secure-token");

    expect(html).not.toContain('<dialog class="nominal-message-dialog"');
    expect(html).not.toContain("Ler mensagem completa");
  });

  it("uses the date as a full-scale graphic on tall desktop invitations", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("@media(min-width:1101px) and (min-height:800px)");
    expect(html).toContain("minmax(0,1.42fr) minmax(230px,.6fr) minmax(300px,.78fr)");
    expect(html).toContain("font-size:min(36vw,68vh,560px)");
    expect(html).toContain("top:46%;left:48%");
  });

  it("removes the empty date row from the nominal mobile hero", () => {
    const html = renderInvitationHtml(baseHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("grid-template-rows:auto 0 auto auto!important");
    expect(html).toContain(".hero-date[data-astro-cid-uieih2gt]{display:none!important}");
    expect(html).toContain(".nominal-action[data-astro-cid-uieih2gt]{grid-row:3;overflow:visible");
  });

  it("removes missing responsive venue candidates", () => {
    const html = sanitizeAmplifyDayHtml(baseHtml);

    expect(html).not.toContain("ulysses-640.avif");
    expect(html).not.toContain("ulysses-640.webp");
    expect(html).not.toContain("ulysses-1080.avif");
    expect(html).toContain("ulysses-1080.webp");
  });

  it("reuses the approved compatibility field to collect WhatsApp", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><form><label><span>LinkedIn <i>opcional</i></span><input type="url" name="linkedin"></label></form></body></html>`);

    expect(html).not.toContain("LinkedIn");
    expect(html).toContain('type="tel" name="linkedin"');
    expect(html).toContain("WhatsApp");
    expect(html).toContain("Informe um WhatsApp válido, com DDD.");
  });

  it("makes live form errors prominent and accessible", () => {
    const html = sanitizeAmplifyDayHtml(baseHtml);

    expect(html).toContain('.form .note.active');
    expect(html).toContain('.qualification-note[data-status="error"]');
    expect(html).toContain('font:650 14px/1.35');
    expect(html).toContain('data-status="error"');
    expect(html).toContain("MutationObserver");
    expect(html).toContain("DOMContentLoaded");
  });

  it("offers explicit calendar providers instead of downloading immediately", () => {
    const html = sanitizeAmplifyDayHtml(baseHtml);

    expect(html).toContain("Onde você usa sua agenda?");
    expect(html).toContain("Google Agenda");
    expect(html).toContain("Outlook / Microsoft 365");
    expect(html).toContain("Apple / outro (.ics)");
    expect(html).toContain("https://calendar.google.com/calendar/render");
    expect(html).toContain("https://outlook.office.com/calendar/0/deeplink/compose");
    expect(html).toContain("event.stopImmediatePropagation()");
    expect(html).toContain("data-calendar-provider=\"ics\"");
  });

  it("renders the complete organization wall with Itaú and accessible carousel controls", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><section class="coalition section-shell" id="coalizadoras"><p>antigo</p></section><section class="proof section-shell" aria-labelledby="proof-title"><p>antigo</p></section></body></html>`);

    expect(html).toContain("Empresas em que já atuamos.");
    expect(html).toContain('alt="Itaú"');
    expect(html.match(/class="brand-mark"/g)).toHaveLength(21);
    expect(html.match(/class="brand-page"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Ver próximas marcas"');
    expect(html).toContain("data-conversion-anchor");
    expect(html).toContain("Fernando Godoy");
    expect(html).toContain("Leonardo Camacho");
    expect(html).toContain("Magno Maciel");
    expect(html).toContain("realizer--xvia");
    expect(html).toContain("Tecnologia a serviço do cidadão.");
    expect(html).not.toContain("As marcas abaixo não patrocinam nem participam do Amplify Day.");
  });

  it("keeps the approved Palco Amplify experience copy", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><section class="experience"><p>antigo</p></section><section class="city-transition"><p>cidade</p></section></body></html>`);

    expect(html).toContain("Palco TEIA");
    expect(html).toContain("Palco Amplify");
    expect(html).toContain("Dois palcos, dois temas essenciais.");
    expect(html).toContain("02 · Edição 2026");
    expect(html).toContain("border-bottom:1px solid rgba(11,14,12,.72)");
    expect(html).toContain("Painel: IA para gestão pública");
    expect(html).toContain("Como otimizar a gestão e o atendimento ao cidadão com IA.");
    expect(html).toContain("O impacto da adoção de IA na educação.");
    expect(html).toContain("Como a IA está transformando a forma como aprendemos e ensinamos.");
    expect(html).not.toContain("Deslize para ver o Palco Amplify");
    expect(html).not.toContain('class="experience-refined__grid" tabindex="0"');
    expect(html).not.toContain("city-transition");
    expect(html).not.toContain("Palco XC");
  });

  it("renumbers the remaining folds and keeps FAQ answers legible", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body>
      <section class="location"><span>04 · Local</span></section>
      <section class="coalition section-shell" id="coalizadoras"><p>antigo</p></section>
      <section class="proof section-shell" aria-labelledby="proof-title"><p>antigo</p></section>
      <section class="faq section-shell" id="faq"><div class="faq-list"></div></section>
    </body></html>`);

    expect(html).toContain("03 · Local");
    expect(html).toContain("04 · Palestrantes confirmados");
    expect(html).toContain("05 · Organizações");
    expect(html).toContain("06 · Realização");
    expect(html).toContain("07 · Perguntas frequentes");
    expect(html).not.toContain("09 · Perguntas frequentes");
    expect(html).toContain("color:#0b0e0c!important;-webkit-text-fill-color:#0b0e0c");
  });

  it("uses the simplified event positioning and confirmation CTA in the open flow", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><p class="hero-audience">Um encontro presencial, por convite, para quem decide, influencia ou coloca IA em prática.</p><p class="cta-note">Cadastre seu interesse. Nosso time entra em contato após analisar seu perfil.</p><button>Entrar na lista prioritária</button><p>Recebemos seu perfil. Quando a curadoria abrir, você recebe notícias por e-mail.<strong data-astro-cid-uieih2gt> Até lá, reserve 23 de setembro.</strong></p></body></html>`);

    expect(html).toContain("Evento presencial.");
    expect(html).not.toContain("por convite e com vagas limitadas");
    expect(html).toContain("transformação da IA na educação e no governo");
    expect(html).not.toContain("nas grandes corporações e no governo");
    expect(html).not.toContain("O cadastro não garante a vaga");
    expect(html).toContain("Confirme sua presença");
  });

  it("keeps confirmation language on nominal invitation links", () => {
    const openHtml = `<html><head></head><body><aside class="hero-action">Original</aside><button data-open>Entrar na lista prioritária</button></body></html>`;
    const html = renderInvitationHtml(openHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("Confirme sua presença");
    expect(html).not.toContain("Confirmar minha presença");
    expect(html).not.toContain("Quero participar");
  });

  it("adapts public curation language for a guest who already has a nominal invitation", () => {
    const openHtml = `<html><head><title>Amplify Day 2026 | Reserve a data</title><meta property="og:title" content="Amplify Day 2026 | Reserve a data"></head><body>
      <aside class="hero-action">Original</aside>
      <div class="curation"><p class="curation-label">Como entrar nessa sala</p><ol><li>Você deixa seu nome.</li></ol><button>Entrar na lista prioritária</button></div>
      <section class="faq section-shell" id="faq"><div class="faq-list"></div></section>
      <section class="final-cta"><h2>Quer estar nessa sala?</h2><p>Deixe seu contato. A gente conhece seu perfil e avisa quando a curadoria abrir.</p><button>Entrar na lista prioritária</button></section>
    </body></html>`;
    const html = renderInvitationHtml(openHtml, { ok: true, invitation }, "secure-token");

    expect(html.match(/Seu convite para o Ampl_IA Day by X-Via 2026/g)).toHaveLength(2);
    expect(html).toContain("Como entrar nessa sala");
    expect(html).toContain("Como confirmo minha participação?");
    expect(html).toContain("Preencha empresa e cargo e confirme sua presença.");
    expect(html).not.toContain("Seu convite já está reservado. Confirme sua presença para concluir a inscrição.");
    expect(html).not.toContain("O cadastro confirma minha participação?");
    expect(html).not.toContain("Nosso grupo de networking entrará em contato");
  });

  it("keeps the current public sections in the nominal version", () => {
    const openHtml = `<html><head></head><body>
      <aside class="hero-action">Original</aside>
      <section class="experience"><p>antigo</p></section><section class="city-transition"><p>cidade</p></section>
      <section class="coalition section-shell" id="coalizadoras"><p>antigo</p></section><section class="proof section-shell" aria-labelledby="proof-title"><p>antigo</p></section>
    </body></html>`;
    const html = renderInvitationHtml(openHtml, { ok: true, invitation }, "secure-token");

    expect(html).toContain("Painel: IA para gestão pública");
    expect(html).toContain("O impacto da adoção de IA na educação.");
    expect(html).toContain("Magno Maciel");
    expect(html).toContain('alt="Itaú"');
    expect(html).toContain('alt="XC Studio"');
    expect(html).not.toContain("Palco XC");
  });

  it("uses Confirme sua presença for every general participation CTA", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><button data-open>Entrar na lista prioritária</button><button data-open>Lista prioritária</button><button data-open>Quero entrar</button></body></html>`);

    expect(html.match(/Confirme sua presença/g)).toHaveLength(3);
    expect(html).not.toContain("Lista prioritária");
    expect(html).not.toContain("Quero participar");
  });

  it("removes the audience fold and the final networking copy", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><section class="audience section-shell" id="para-quem"><div class="curation"><p class="curation-label">Como entrar nessa sala</p><ol><li>Você deixa seu nome.</li></ol><button>Entrar na lista prioritária</button></div></section><section class="final-cta"><h2>Quer estar<br>nessa sala?</h2><p>Deixe seu contato. A gente conhece seu perfil e avisa quando a curadoria abrir.</p><button>Entrar na lista prioritária</button></section></body></html>`);

    expect(html).not.toContain('id="para-quem"');
    expect(html).not.toContain("Como entrar nessa sala");
    expect(html).not.toContain("Você deixa seu nome");
    expect(html).toContain("Queremos você");
    expect(html).toContain("nessa conversa");
    expect(html).not.toContain("Nosso grupo de networking entrará em contato");
    expect(html).not.toContain("Deixe seu contato. A gente conhece seu perfil");
    expect(html).toContain("Confirme sua presença");
  });

  it("renders the XC Studio mark without limited-capacity stamps", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><footer class="hero-foot"><p>antigo</p></footer><div class="response-copy"><p>Lista prioritária</p><h2>Quer estar nessa sala?</h2></div><p class="qualification-index">02 · Um pouco sobre você</p><p>Conte onde você trabalha e o que decide por lá. Isso ajuda a montar uma sala que faça sentido.</p><label><span>LinkedIn <i>opcional</i></span><input type="url" name="linkedin"></label></body></html>`);

    expect(html).not.toContain("limited-stamp");
    expect(html).toContain("Informe seu WhatsApp para entrarmos em contato com o status da sua inscrição.");
    expect(html).toContain("Por que pedimos?");
    expect(html).toContain('role="tooltip"');
    expect(html).toContain('aria-describedby="whatsapp-rationale whatsapp-help"');
    expect(html).not.toContain("Conte onde você trabalha");
    expect(html).not.toContain("As vagas são limitadas.");
    expect(html).toContain("/amplify-day/logos/xc-studio-black.webp");
    expect(html).toContain("Realização: X-VIA, Amplify e Shock Wave");
    expect(html).toContain('class="xvia"');
  });

  it("updates the FAQ with curation, line-up CTA, venue map and WhatsApp", () => {
    const html = sanitizeAmplifyDayHtml(`<html><head></head><body><section class="faq section-shell" id="faq"><header><h2>FAQ antiga</h2></header><div class="faq-list"><details><summary>Antiga</summary><p>Resposta antiga</p></details></div></section></body></html>`);

    expect(html).toContain("As vagas são limitadas e sujeitas à disponibilidade.");
    expect(html).toContain("Se sua inscrição for confirmada");
    expect(html).toContain("Confirme sua presença");
    expect(html).toContain('data-cta-position="faq-lineup"');
    expect(html).toContain("Centro de Convenções Ulysses Guimarães");
    expect(html).toContain("https://www.google.com/maps/search/?api=1&amp;query=Centro+de+Conven");
    expect(html).toContain("autorizar o uso do WhatsApp informado no cadastro");
    expect(html).not.toContain("FAQ antiga");
  });
});
