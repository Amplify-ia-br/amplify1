import { getPreferredName } from "./personalization.js";

const SCOPE = "data-astro-cid-uieih2gt";
const PUBLIC_CTA_LABEL = "Confirme sua presença";
const INVITATION_CTA_LABEL = "Confirme sua presença";
const EVENT_POSITIONING = "Um dia de conversas com quem lidera a transformação da IA na educação e no governo.";
const EVENT_FORMAT_NOTICE = "Evento presencial.";
const EVENT_NAME = "Ampl_IA Day by X-Via";

const brandLockup = (compact = false) => {
  const endorsement = compact
    ? `<span class="amplia-lockup__endorsement-text" aria-hidden="true" ${SCOPE}>by X-Via</span>`
    : `<span class="amplia-lockup__endorsement" aria-hidden="true" ${SCOPE}><span class="amplia-lockup__by" ${SCOPE}>by</span><span class="amplia-lockup__xvia-horizontal" ${SCOPE}><img class="amplia-lockup__xvia-symbol" src="/amplify-day/brand/xvia-symbol-color.png" alt="" width="327" height="212" ${SCOPE}><span class="amplia-lockup__xvia-wordmark" ${SCOPE}><img class="amplia-lockup__xvia-base" src="/_astro/xvia-white.ClfTZZ9-.png" alt="" width="3426" height="774" ${SCOPE}></span></span></span>`;

  return `<span class="amplia-lockup${compact ? " amplia-lockup--compact" : ""}" aria-label="Ampl_IA Day by X-Via" ${SCOPE}><span class="amplia-lockup__name" aria-hidden="true" ${SCOPE}>Ampl<span class="amplia-lockup__ia" ${SCOPE}>_IA</span> Day</span>${endorsement}</span>`;
};

const brandPreviewStyles = `
<style>
  :root{--amplia-green:#08b7c7;--xvia-ink:#213744;--xvia-blue:#476c7b;--xvia-line:rgba(71,108,123,.34)}
  .amplia-lockup{display:inline-flex;flex-direction:column;align-items:flex-start;gap:.11em;color:inherit;line-height:.82}
  .amplia-lockup__name{display:block;white-space:nowrap}
  .amplia-lockup__ia{color:var(--amplia-green)}
  .amplia-lockup__endorsement{display:flex;align-self:flex-end;align-items:center;gap:.075em;min-height:clamp(30px,.39em,44px)}
  .amplia-lockup__by{display:block;color:#0b0e0c;font-family:Inter,sans-serif;font-size:clamp(9px,.13em,14px);font-weight:750;line-height:1;letter-spacing:.08em;text-transform:lowercase;white-space:nowrap}
  .amplia-lockup__xvia-horizontal{display:flex;width:auto;height:clamp(19px,.24em,28px);align-items:center;gap:clamp(3px,.035em,5px)}
  .amplia-lockup__xvia-symbol{display:block;width:auto;height:100%;filter:none}
  .amplia-lockup__xvia-wordmark{position:relative;display:block;height:100%;aspect-ratio:2.51/1;overflow:hidden}
  .amplia-lockup__xvia-base{position:absolute;left:0;top:0;display:block;width:auto;max-width:none;height:100%;filter:brightness(0);opacity:.94;transform:translateX(-43.35%)}
  .amplia-lockup__endorsement-text{align-self:flex-end;color:#0b0e0c;font:750 clamp(8px,.1em,11px)/1 Inter,sans-serif;letter-spacing:.035em;white-space:nowrap}
  .amplia-lockup--compact{gap:3px;line-height:1}
  .amplia-lockup--compact .amplia-lockup__endorsement-text{font-size:6px;letter-spacing:.04em}
  .hero-head{position:relative}
  .hero-head:after{content:"";position:absolute;right:0;bottom:0;width:clamp(90px,12vw,190px);height:5px;background:linear-gradient(90deg,var(--amplia-green) 0 28%,transparent 28% 35%,var(--xvia-blue) 35% 70%,transparent 70% 77%,var(--xvia-ink) 77%);opacity:.88}
  .experience-refined__header{position:relative}
  .experience-refined__header:after{content:"";display:block;width:min(360px,42vw);height:3px;margin-top:clamp(13px,1.7vh,20px);background:linear-gradient(90deg,var(--amplia-green) 0 35%,transparent 35% 40%,var(--xvia-blue) 40% 68%,transparent 68% 73%,var(--xvia-ink) 73%)}
  .experience-stage--xc .experience-stage__art{color:var(--xvia-blue)!important;opacity:.64}
  .brand-fold{min-height:calc(100svh - 64px);padding:clamp(48px,6vw,92px) clamp(28px,7.5vw,118px);font-family:Inter,sans-serif}
  .brand-fold__eyebrow{display:block;margin:0 0 18px;color:#08b7c7;font:700 10px/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase}
  .brand-fold h2{max-width:1120px;margin:0;font:700 clamp(48px,5.4vw,84px)/.9 "Bricolage Grotesque",sans-serif;letter-spacing:-.065em;text-transform:uppercase;text-wrap:balance}
  .brand-holding{display:grid;height:calc(100svh - 64px);min-height:0;grid-template-rows:auto minmax(0,1fr);overflow:hidden;padding:clamp(24px,3.8vh,42px) clamp(28px,7.5vw,118px) clamp(20px,3vh,32px);color:#0b0e0c;background:#f0eee6}
  .brand-holding__header{display:block}
  .brand-holding h2{max-width:900px;font-size:clamp(42px,4.2vw,66px);line-height:.88}
  .brand-holding__intro{max-width:430px;margin:0 0 2px;font:550 clamp(13px,1.02vw,16px)/1.35 "Bricolage Grotesque",sans-serif;letter-spacing:-.015em}
  .brand-holding__viewport{min-height:0;margin-top:clamp(14px,2.1vh,22px);overflow:hidden}
  .brand-holding__track{display:grid;height:100%;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:repeat(3,minmax(0,1fr));border-top:1px solid rgba(11,14,12,.42);border-left:1px solid rgba(11,14,12,.42)}
  .brand-page{display:contents}
  .brand-mark{display:grid;min-width:0;min-height:0;place-items:center;overflow:hidden;padding:clamp(8px,1.25vw,18px);border-right:1px solid rgba(11,14,12,.42);border-bottom:1px solid rgba(11,14,12,.42)}
  .brand-mark img{display:block;width:auto;height:auto;max-width:var(--logo-max-width,72%);max-height:var(--logo-max-height,56%);object-fit:contain;filter:brightness(0);transform:translate(var(--logo-x,0),var(--logo-y,0)) scale(var(--logo-scale,1));transform-origin:center}
  .brand-carousel__controls{display:none}
  body[data-brand-section-visible="true"] [data-floating-cta],body[data-speaker-section-visible="true"] [data-floating-cta],body[data-experience-section-visible="true"] [data-floating-cta],body[data-realization-section-visible="true"] [data-floating-cta]{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
  .hero-head .purpose{display:none!important}
  .hero-head{justify-content:flex-start!important}
  .editorial-nav .nav-meta span:last-child{font-size:clamp(11px,.86vw,14px)!important;font-weight:750!important;letter-spacing:.1em!important;color:#0b0e0c!important}
  .experience-refined{display:grid;height:calc(100svh - 64px);min-height:0;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden;border-bottom:1px solid rgba(11,14,12,.72);padding:clamp(24px,3.8vh,42px) clamp(28px,7.5vw,118px) clamp(18px,2.6vh,28px);color:#0b0e0c;background:#f0eee6}
  .experience-refined__header{max-width:1280px}
  .experience-refined__header h2{max-width:1250px;margin:0;font:700 clamp(38px,4.1vw,64px)/.92 "Bricolage Grotesque",sans-serif;letter-spacing:-.055em;text-transform:uppercase;text-wrap:balance}
  .experience-refined__intro{margin:clamp(10px,1.5vh,16px) 0 clamp(14px,2vh,20px);font:550 clamp(15px,1.08vw,18px)/1.3 "Bricolage Grotesque",sans-serif;letter-spacing:-.015em}
  .experience-refined__grid{display:grid;min-height:0;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid rgba(11,14,12,.58);border-left:1px solid rgba(11,14,12,.58)}
  .experience-stage{display:grid;min-height:0;grid-template-rows:auto minmax(90px,1fr) auto;padding:clamp(18px,2vw,30px);border-right:1px solid rgba(11,14,12,.58);border-bottom:1px solid rgba(11,14,12,.58)}
  .experience-stage__label{margin:0;color:#08a9b8;font:700 10px/1 Inter,sans-serif;letter-spacing:.16em;text-transform:uppercase}
  .experience-stage__art{display:grid;min-height:0;place-items:center;color:#d31854}
  .experience-stage__art svg{display:block;width:min(33%,210px);height:auto;max-height:150px;fill:none;stroke:currentColor;stroke-width:1.5}
  .experience-stage--xc .experience-stage__art{color:rgba(11,14,12,.3)}
  .experience-stage__copy h3{max-width:720px;margin:0;font:700 clamp(25px,2.35vw,38px)/.98 "Bricolage Grotesque",sans-serif;letter-spacing:-.045em;text-transform:uppercase;text-wrap:balance}
  .experience-stage__copy p{max-width:680px;margin:10px 0 0;font:550 clamp(13px,1vw,16px)/1.28 "Bricolage Grotesque",sans-serif;letter-spacing:-.012em}
  .experience-refined__note{margin:10px 0 0;text-align:right;font:650 clamp(10px,.76vw,12px)/1.2 Inter,sans-serif;letter-spacing:.01em}
  .experience-refined__swipe{display:none}
  .hero-partners{display:grid!important;grid-template-columns:auto 1px minmax(320px,.8fr);align-items:center;justify-content:stretch!important;gap:clamp(18px,2vw,30px)!important}
  .hero-partner-group{display:flex;align-items:center;gap:clamp(12px,1.3vw,20px);min-width:0}
  .hero-partner-label,.hero-curation span{font:700 8px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .hero-partners .brands{flex-shrink:0}
  .hero-partner-separator{width:1px;height:46px;background:rgba(11,14,12,.42)}
  .hero-support{display:flex;align-items:center;justify-content:flex-start;min-width:0;gap:clamp(14px,1.4vw,22px)}
  .hero-support img{display:block;width:clamp(48px,4.35vw,69px);height:auto;max-height:38px;object-fit:contain}
  .hero-curation{display:grid;gap:5px;margin:0!important;text-align:left!important;text-transform:none!important}
  .hero-curation strong{font:650 clamp(10px,.78vw,12px)/1.22 "Bricolage Grotesque",sans-serif;letter-spacing:-.01em}
  .limited-highlight{padding:0 .08em;color:inherit;background:linear-gradient(transparent 55%,rgba(8,183,199,.42) 55% 92%,transparent 92%);font-weight:720;-webkit-box-decoration-break:clone;box-decoration-break:clone}
  .faq.section-shell[data-astro-cid-uieih2gt]{color:#0b0e0c;background:#f0eee6}
  .faq.section-shell[data-astro-cid-uieih2gt] h2[data-astro-cid-uieih2gt],.faq.section-shell[data-astro-cid-uieih2gt] summary[data-astro-cid-uieih2gt],.faq.section-shell[data-astro-cid-uieih2gt] p[data-astro-cid-uieih2gt],.faq.section-shell[data-astro-cid-uieih2gt] a[data-astro-cid-uieih2gt]{color:#0b0e0c}
  .faq.section-shell[data-astro-cid-uieih2gt] details[data-astro-cid-uieih2gt] p[data-astro-cid-uieih2gt]{color:#0b0e0c!important;-webkit-text-fill-color:#0b0e0c}
  .faq.section-shell[data-astro-cid-uieih2gt] details[data-astro-cid-uieih2gt]{border-color:rgba(11,14,12,.48)}
  .faq .faq-inline-cta[data-astro-cid-uieih2gt]{display:inline-flex;align-items:center;gap:8px;margin-top:14px;border:0;border-bottom:2px solid currentColor;padding:0 0 4px;color:#0b0e0c!important;background:transparent;font:750 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
  .faq .faq-inline-cta[data-astro-cid-uieih2gt]:hover{color:#08b7c7!important}
  .faq-inline-cta:focus-visible{outline:3px solid #08b7c7;outline-offset:4px}
  .faq-venue-link{color:inherit;text-decoration-thickness:1px;text-underline-offset:3px}
  .faq-venue-link:hover{color:#078d99}
  .curation .curation-copy[data-astro-cid-uieih2gt]{max-width:430px;margin:18px 0 28px;color:#f0eee6;font:600 clamp(19px,1.65vw,27px)/1.15 "Bricolage Grotesque",sans-serif;letter-spacing:-.035em}
  .qualification-form .whatsapp-field{position:relative;display:grid;min-width:0}
  .whatsapp-field__head{position:relative;display:flex;align-items:center;justify-content:space-between;gap:14px}
  .whatsapp-field__head>label{color:#f0eee6;font:700 9px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .whatsapp-help{position:relative;margin:0;color:#f0eee6}
  .whatsapp-help summary{display:inline-flex;align-items:center;gap:6px;border:0;border-bottom:1px solid currentColor;padding:0 0 4px;color:inherit;background:transparent;font:700 10.5px/1 Inter,sans-serif;letter-spacing:.01em;cursor:help;list-style:none}
  .whatsapp-help summary::-webkit-details-marker{display:none}
  .whatsapp-help summary:after{content:"?";display:grid;width:16px;height:16px;place-items:center;border:1px solid currentColor;border-radius:50%;font:750 10px/1 Inter,sans-serif}
  .whatsapp-help summary:focus-visible{outline:2px solid #08d3df;outline-offset:4px}
  .whatsapp-help__bubble{display:none;position:absolute;z-index:12;top:calc(100% + 9px);right:0;width:min(310px,72vw);margin:0;padding:12px 14px;border:1px solid #0b0e0c;color:#0b0e0c;background:#f0eee6;box-shadow:7px 7px 0 rgba(11,14,12,.2);font:600 12px/1.35 "Bricolage Grotesque",sans-serif;letter-spacing:0;text-transform:none}
  .whatsapp-help[open] .whatsapp-help__bubble,.whatsapp-help:hover .whatsapp-help__bubble,.whatsapp-help:focus-within .whatsapp-help__bubble{display:block}
  .speaker-fold{display:grid;height:calc(100svh - 64px);min-height:0;grid-template-rows:auto minmax(0,1fr);overflow:hidden;padding:clamp(24px,3.8vh,42px) clamp(28px,7.5vw,118px) clamp(20px,3vh,32px);color:#f0eee6;background:#111614}
  .speaker-fold__header{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(280px,.7fr);align-items:end;gap:32px}
  .speaker-fold h2{max-width:860px;font-size:clamp(44px,4.8vw,76px);line-height:.88}
  .speaker-fold__intro{max-width:420px;margin:0 0 3px;color:rgba(240,238,230,.72);font:550 clamp(14px,1.05vw,17px)/1.35 "Bricolage Grotesque",sans-serif;letter-spacing:-.015em}
  .speaker-fold__header-side{display:grid;justify-items:start;gap:16px}
  .speaker-cta{width:min(100%,360px)!important;height:50px!important;min-height:50px;border-color:#f0eee6!important}
  .speaker-carousel{display:grid;min-height:0;grid-template-rows:minmax(0,1fr) auto;margin-top:clamp(16px,2.4vh,24px)}
  .speaker-track{display:flex;min-height:0;overflow-x:auto;overflow-y:hidden;border-top:1px solid rgba(240,238,230,.4);border-left:1px solid rgba(240,238,230,.4);scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-inline:contain}
  .speaker-track::-webkit-scrollbar{display:none}
  .speaker-card{display:grid;flex:0 0 50%;min-width:0;min-height:0;grid-template-columns:minmax(148px,.38fr) minmax(0,.62fr);grid-template-rows:auto auto minmax(0,1fr);align-content:start;column-gap:clamp(18px,1.8vw,28px);row-gap:0;padding:clamp(18px,2vw,30px);border-right:1px solid rgba(240,238,230,.4);border-bottom:1px solid rgba(240,238,230,.4);scroll-snap-align:start;scroll-snap-stop:always}
  .speaker-card__index{grid-column:1/-1;margin-bottom:clamp(14px,2vh,22px);color:#08b7c7;font:700 10px/1 Inter,sans-serif;letter-spacing:.16em}
  .speaker-card__media{grid-column:1;grid-row:2/4;position:relative;align-self:start;width:100%;aspect-ratio:4/5;overflow:hidden;border:1px solid rgba(240,238,230,.42);background:#0b0e0c}
  .speaker-card__media:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,rgba(8,183,199,.14));pointer-events:none}
  .speaker-card__media img{display:block;width:100%;height:100%;object-fit:cover;object-position:var(--speaker-x,50%) var(--speaker-y,50%);filter:saturate(.82) contrast(1.04)}
  .speaker-card__identity{grid-column:2;grid-row:2;min-width:0}
  .speaker-card h3{max-width:620px;margin:0;font:700 clamp(27px,2.45vw,40px)/.92 "Bricolage Grotesque",sans-serif;letter-spacing:-.055em;text-transform:uppercase;text-wrap:balance}
  .speaker-card h3 span{display:block;margin-top:10px;color:rgba(240,238,230,.62);font:650 clamp(9px,.72vw,12px)/1.25 Inter,sans-serif;letter-spacing:.07em;text-transform:uppercase}
  .speaker-card__bio{grid-column:2;grid-row:3;max-width:650px;margin:clamp(14px,2vh,20px) 0 0;color:rgba(240,238,230,.82);font:500 clamp(11.5px,.86vw,14px)/1.34 "Bricolage Grotesque",sans-serif;letter-spacing:-.01em}
  .speaker-controls{display:grid;grid-template-columns:48px 1fr 48px;align-items:center;gap:12px;padding-top:12px}
  .speaker-controls button{display:grid;width:48px;height:44px;place-items:center;border:1px solid rgba(240,238,230,.7);color:#f0eee6;background:transparent;cursor:pointer}
  .speaker-controls button:disabled{opacity:.25;cursor:default}
  .speaker-controls button:focus-visible,.speaker-track:focus-visible{outline:3px solid #08b7c7;outline-offset:3px}
  .speaker-controls svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6}
  .speaker-status{text-align:center;font:700 10px/1 Inter,sans-serif;letter-spacing:.16em}
  .realization-fold{display:grid;grid-template-columns:minmax(210px,18%) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto;padding:0;color:#f0eee6;background:#111614}
  .realization-fold__image{grid-row:1/4;position:relative;overflow:hidden;border-right:1px solid rgba(240,238,230,.28)}
  .realization-fold__image img{width:100%;height:100%;object-fit:cover;object-position:30% 58%;filter:grayscale(1) contrast(1.06) brightness(.64)}
  .realization-fold__image:after{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(240,238,230,.25) .65px,transparent .8px);background-size:7px 7px;mix-blend-mode:screen;opacity:.22;pointer-events:none}
  .realization-fold__header{grid-column:2;padding:clamp(32px,4vh,48px) clamp(28px,3.2vw,52px) clamp(20px,2.6vh,30px)}
  .realization-fold__header h2{max-width:1060px;font-size:clamp(45px,4.8vw,74px)}
  .realization-grid{grid-column:2;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 clamp(28px,3.2vw,52px);border-top:1px solid rgba(240,238,230,.38);border-bottom:1px solid rgba(240,238,230,.38)}
  .realizer{min-width:0;padding:clamp(22px,3vh,34px) clamp(18px,2vw,30px)}
  .realizer+.realizer{border-left:1px solid rgba(240,238,230,.3)}
  .realizer__mark{display:flex;align-items:center;height:clamp(58px,8vh,82px);margin-bottom:clamp(22px,3vh,34px)}
  .realizer__mark img{display:block;width:auto;max-width:min(100%,240px);max-height:64px;object-fit:contain;object-position:left center;filter:grayscale(1) brightness(0) invert(1)}
  .realizer--xvia .realizer__mark img{width:min(100%,230px);max-height:52px}
  .realizer--shock .realizer__mark img{max-height:72px}
  .realizer h3{margin:0;font:700 clamp(25px,2vw,32px)/.96 "Bricolage Grotesque",sans-serif;letter-spacing:-.045em;text-transform:uppercase;text-wrap:balance}
  .realizer>p{max-width:430px;margin:18px 0 0;color:rgba(240,238,230,.76);font:500 clamp(13px,1vw,16px)/1.38 "Bricolage Grotesque",sans-serif;letter-spacing:-.012em}
  .realization-support{grid-column:2;display:grid;grid-template-columns:minmax(190px,.34fr) minmax(0,1fr);margin:0 clamp(28px,3.2vw,52px);border-bottom:1px solid rgba(240,238,230,.38)}
  .realization-support__item{display:flex;min-width:0;align-items:center;gap:18px;padding:18px 0 clamp(22px,3vh,32px);color:#f0eee6}
  .realization-support__item+.realization-support__item{border-left:1px solid rgba(240,238,230,.3);padding-left:clamp(22px,2.5vw,38px)}
  .realization-support__item span{flex:0 0 auto;color:#f0eee6;font:700 9px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .realization-support__item strong{color:#08b7c7;font:750 clamp(13px,1vw,16px)/1.2 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase}
  .realization-support__item img{display:block;width:58px;height:auto;max-height:52px;object-fit:contain;filter:grayscale(1) brightness(0) invert(1)}
  @media(max-width:1100px){
    .editorial-nav{grid-template-columns:auto 1fr!important}
    .nav-links{display:none!important}
    .brand-holding{height:calc(100svh - 64px);padding:clamp(24px,3.4vh,34px) 28px calc(18px + env(safe-area-inset-bottom))}
    .brand-holding__viewport{display:grid;min-height:0;grid-template-rows:minmax(0,1fr) auto;margin-top:14px;overflow:visible}
    .brand-holding__track{display:flex;height:auto;min-height:0;overflow-x:auto;overflow-y:hidden;border:0;scroll-snap-type:x mandatory;scroll-behavior:smooth;scrollbar-width:none;overscroll-behavior-inline:contain}
    .brand-holding__track::-webkit-scrollbar{display:none}
    .brand-page{display:grid;flex:0 0 100%;min-width:100%;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));border-top:1px solid rgba(11,14,12,.42);border-left:1px solid rgba(11,14,12,.42);scroll-snap-align:start;scroll-snap-stop:always}
    .brand-carousel__controls{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px;padding-top:9px}
    .brand-carousel__controls button{display:grid;width:44px;height:40px;place-items:center;border:1px solid #0b0e0c;color:#0b0e0c;background:transparent;font:600 21px/1 Inter,sans-serif;cursor:pointer}
    .brand-carousel__controls button:disabled{opacity:.28;cursor:default}
    .brand-carousel__controls button:focus-visible,.brand-holding__track:focus-visible{outline:3px solid #08b7c7;outline-offset:3px}
    .brand-carousel__status{text-align:center;font:700 10px/1 Inter,sans-serif;letter-spacing:.16em}
    .realization-fold{grid-template-columns:1fr;padding:0 48px 54px}
    .realization-fold__image{grid-column:1;grid-row:auto;height:300px;margin:0 -48px;border-right:0;border-bottom:1px solid rgba(240,238,230,.28)}
    .realization-fold__header,.realization-grid,.realization-support{grid-column:1}
    .realization-fold__header{padding-inline:0}
    .realization-grid,.realization-support{margin-inline:0}
    .hero-partners{grid-template-columns:auto 1px minmax(250px,.72fr)}
    .hero-partner-label{display:none}
    .speaker-card{flex-basis:100%;grid-template-columns:minmax(190px,.34fr) minmax(0,.66fr)}
    .speaker-card h3{font-size:clamp(32px,4.8vw,48px)}
    .speaker-card__bio{font-size:clamp(13px,1.6vw,16px)}
  }
  @media(max-width:760px){
    .hero-head:after{width:118px;height:4px}
    .amplia-lockup--compact .amplia-lockup__endorsement-text{font-size:5.5px}
    .hero[data-astro-cid-uieih2gt]{height:auto!important;min-height:0!important;grid-template-rows:auto clamp(240px,33svh,290px) auto auto!important}
    .hero-date[data-astro-cid-uieih2gt]{min-height:0!important}
    .hero-date[data-astro-cid-uieih2gt] .field[data-astro-cid-uieih2gt]{width:72%!important}
    .hero-date[data-astro-cid-uieih2gt] .core[data-astro-cid-uieih2gt],.hero-date[data-astro-cid-uieih2gt] .echo[data-astro-cid-uieih2gt]{font-size:min(58vw,28svh,230px)!important}
    .primary[data-astro-cid-uieih2gt],.secondary-cta[data-astro-cid-uieih2gt],.speaker-cta[data-astro-cid-uieih2gt],[data-floating-cta][data-astro-cid-uieih2gt]{min-height:58px!important;font-size:12px!important;letter-spacing:.13em!important}
    .cta-note[data-astro-cid-uieih2gt]{font-size:10.5px!important;line-height:1.45!important}
    .brand-fold{min-height:0;padding:54px 20px}
    .brand-fold h2{font-size:clamp(42px,11.6vw,57px);line-height:.91}
    .brand-holding{height:calc(100svh - 58px);padding:clamp(24px,3.4vh,32px) 20px calc(18px + env(safe-area-inset-bottom))}
    .brand-holding__header{display:block}
    .brand-holding h2{max-width:350px;font-size:clamp(31px,9.2vw,39px);line-height:.9}
    .brand-holding .brand-fold__eyebrow{margin-bottom:12px}
    .brand-holding__intro{max-width:350px;margin-top:12px;font-size:12px;line-height:1.32}
    .brand-page{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(4,minmax(0,1fr))}
    .brand-mark{padding:7px 10px}
    .brand-mark img{max-width:min(var(--logo-max-width,72%),150px);max-height:min(var(--logo-max-height,56%),58px)}
    .hero-partners{display:grid!important;grid-template-columns:minmax(0,1.08fr) 1px minmax(0,.92fr);min-height:86px!important;gap:12px!important;padding:12px 0}
    .hero-partner-group{gap:6px}
    .hero-partners .brands{gap:4px}
    .hero-partners .brands .xvia{width:58px}
    .hero-partners .brands .amplify{width:54px}
    .hero-partners .brands .shock{width:34px}
    .hero-partners .brands>span{font-size:8px}
    .hero-partner-separator{height:52px}
    .hero-support{gap:9px}
    .hero-support img{width:38px;max-height:35px}
    .hero-curation{gap:4px}
    .hero-curation span{font-size:7.5px;line-height:1.1}
    .hero-curation strong{font-size:9.5px;line-height:1.2}
    .curation .curation-copy[data-astro-cid-uieih2gt]{margin:14px 0 22px;font-size:21px}
    .whatsapp-field__head{gap:8px}
    .whatsapp-help summary{font-size:11px}
    .whatsapp-help__bubble{width:min(280px,78vw);font-size:12px;line-height:1.4}
    .editorial-nav .nav-meta span:last-child{font-size:9px!important;letter-spacing:.07em!important}
    .experience-refined{height:auto;min-height:0;display:block;padding:46px 20px}
    .experience-refined__header h2{font-size:clamp(34px,10.4vw,46px);line-height:.92}
    .experience-refined__intro{margin:14px 0 22px;font-size:15px}
    .experience-refined__grid{display:grid;height:auto;min-height:0;grid-template-columns:1fr;overflow:visible;border-bottom:0}
    .experience-stage{display:grid;min-height:clamp(250px,70vw,280px);grid-template-columns:minmax(0,1fr) clamp(68px,22vw,92px);grid-template-rows:auto minmax(0,1fr);align-items:start;column-gap:14px;padding:20px 18px}
    .experience-stage+.experience-stage{border-top:0}
    .experience-stage__label{grid-column:1;grid-row:1}
    .experience-stage__art{grid-column:2;grid-row:1/3;align-self:start;justify-self:end;width:100%;min-height:0;padding-top:2px}
    .experience-stage__art svg{width:100%;height:auto;max-height:92px}
    .experience-stage__copy{grid-column:1;grid-row:2;align-self:end;padding-top:24px}
    .experience-stage__copy h3{font-size:clamp(26px,7.7vw,32px);line-height:.96}
    .experience-stage__copy p{margin-top:10px;font-size:14px;line-height:1.3}
    .experience-refined__note{margin-top:14px;text-align:left;font-size:10px;line-height:1.35}
    .experience-refined__swipe{display:none}
    .speaker-fold{height:calc(100svh - 58px);padding:26px 20px calc(16px + env(safe-area-inset-bottom))}
    .speaker-fold__header{display:block}
    .speaker-fold h2{font-size:clamp(38px,11.5vw,52px);line-height:.89}
    .speaker-fold__intro{margin-top:12px;font-size:13px}
    .speaker-fold__header-side{gap:10px}
    .speaker-cta{height:44px!important;min-height:44px}
    .speaker-carousel{margin-top:15px}
    .speaker-card{flex-basis:100%;grid-template-columns:minmax(88px,34%) minmax(0,66%);grid-template-rows:auto auto minmax(0,1fr);column-gap:14px;padding:15px 14px}
    .speaker-card__index{margin-bottom:12px}
    .speaker-card__media{grid-row:2;aspect-ratio:4/5}
    .speaker-card__identity{grid-row:2;align-self:center}
    .speaker-card h3{font-size:clamp(25px,7.5vw,34px);line-height:.92}
    .speaker-card h3 span{margin-top:8px;font-size:8px;line-height:1.24}
    .speaker-card__bio{grid-column:1/-1;grid-row:3;margin-top:13px;font-size:clamp(11.5px,3.2vw,13px);line-height:1.3}
    .speaker-controls{grid-template-columns:44px 1fr 44px;padding-top:9px}
    .speaker-controls button{width:44px;height:40px}
    .realization-fold{display:block;padding:0 20px 38px}
    .realization-fold__image{height:clamp(220px,32svh,300px);min-height:0;margin:0 -20px}
    .realization-fold__header{padding:42px 0 24px}
    .realization-fold__header h2{font-size:clamp(38px,10.8vw,48px);line-height:.91}
    .realization-grid{display:block;margin:0;border-bottom:0}
    .realizer{display:block;min-height:0;padding:30px 0;border-bottom:1px solid rgba(240,238,230,.38)}
    .realizer+.realizer{border-left:0}
    .realizer__mark{height:58px;margin-bottom:18px}
    .realizer__mark img{max-height:52px}
    .realizer--shock .realizer__mark img{max-height:58px}
    .realizer h3{font-size:clamp(30px,8.8vw,38px);line-height:.96}
    .realizer>p{margin-top:14px;font-size:16px;line-height:1.36}
    .realization-support{grid-template-columns:1fr;margin:0}
    .realization-support__item{padding:20px 0;gap:14px}
    .realization-support__item+.realization-support__item{border-top:1px solid rgba(240,238,230,.3);border-left:0;padding-left:0}
    .realization-support__item img{width:50px;max-height:46px}
  }
  @media(prefers-reduced-motion:reduce){.brand-holding__track,.speaker-track{scroll-behavior:auto}}
</style>`;

const brandCarouselEnhancement = `
<script>
  (() => {
    const initBrandCarousel = () => {
      const section = document.querySelector('#organizacoes');
      const carousel = section?.querySelector('[data-brand-carousel]');
      const track = carousel?.querySelector('[data-brand-track]');
      const previous = carousel?.querySelector('[data-brand-prev]');
      const next = carousel?.querySelector('[data-brand-next]');
      const status = carousel?.querySelector('[data-brand-status]');
      if (!section || !track || !previous || !next || !status) return;

      const carouselMode = window.matchMedia('(max-width: 1100px)');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let page = 0;
      let scrollFrame = 0;

      const render = () => {
        previous.disabled = page === 0;
        next.disabled = page === 2;
        status.textContent = (page + 1) + ' / 3';
      };
      const goTo = (nextPage, announce = true) => {
        page = Math.max(0, Math.min(2, nextPage));
        track.scrollTo({ left: page * track.clientWidth, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        render();
        if (announce) status.setAttribute('aria-label', 'Página ' + (page + 1) + ' de 3');
      };
      const syncFromScroll = () => {
        if (!carouselMode.matches || !track.clientWidth) return;
        page = Math.max(0, Math.min(2, Math.round(track.scrollLeft / track.clientWidth)));
        render();
      };

      previous.addEventListener('click', () => goTo(page - 1));
      next.addEventListener('click', () => goTo(page + 1));
      track.addEventListener('keydown', (event) => {
        if (!carouselMode.matches || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        goTo(page + (event.key === 'ArrowRight' ? 1 : -1));
      });
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(syncFromScroll);
      }, { passive: true });
      new ResizeObserver(() => {
        if (carouselMode.matches) track.scrollTo({ left: page * track.clientWidth, behavior: 'auto' });
      }).observe(track);

      new IntersectionObserver(([entry]) => {
        document.body.dataset.brandSectionVisible = String(entry.isIntersecting && entry.intersectionRatio >= .08);
      }, { threshold: [0, .08], rootMargin: '-58px 0px 0px 0px' }).observe(section);
      render();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrandCarousel, { once: true });
    else initBrandCarousel();
  })();
</script>`;

const speakerCarouselEnhancement = `
<script>
  (() => {
    const initSpeakerCarousel = () => {
      const section = document.querySelector('#palestrantes');
      const track = section?.querySelector('[data-speaker-track]');
      const previous = section?.querySelector('[data-speaker-prev]');
      const next = section?.querySelector('[data-speaker-next]');
      const status = section?.querySelector('[data-speaker-status]');
      if (!section || !track || !previous || !next || !status) return;

      const singleSpeaker = window.matchMedia('(max-width: 1100px)');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let index = 0;
      let scrollFrame = 0;
      const step = () => singleSpeaker.matches ? 1 : 2;
      const last = () => singleSpeaker.matches ? 4 : 3;
      const pageWidth = () => track.clientWidth / step();
      const normalizedIndex = (value) => {
        if (singleSpeaker.matches) return Math.max(0, Math.min(4, value));
        if (value >= 3) return 3;
        return value <= 0 ? 0 : 2;
      };
      const render = () => {
        const end = Math.min(5, index + step());
        previous.disabled = index === 0;
        next.disabled = index >= last();
        status.textContent = singleSpeaker.matches ? (index + 1) + ' / 5' : (index + 1) + '–' + end + ' / 5';
      };
      const goTo = (nextIndex) => {
        index = normalizedIndex(nextIndex);
        track.scrollTo({ left: index * pageWidth(), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        render();
      };
      const sync = () => {
        if (!pageWidth()) return;
        index = normalizedIndex(Math.round(track.scrollLeft / pageWidth()));
        render();
      };

      previous.addEventListener('click', () => goTo(index - step()));
      next.addEventListener('click', () => goTo(index + step()));
      track.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        goTo(index + (event.key === 'ArrowRight' ? step() : -step()));
      });
      track.addEventListener('scroll', () => {
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(sync);
      }, { passive: true });
      new ResizeObserver(() => goTo(index)).observe(track);
      new IntersectionObserver(([entry]) => {
        document.body.dataset.speakerSectionVisible = String(entry.isIntersecting && entry.intersectionRatio >= .08);
      }, { threshold: [0, .08], rootMargin: '-58px 0px 0px 0px' }).observe(section);
      render();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSpeakerCarousel, { once: true });
    else initSpeakerCarousel();
  })();
</script>`;

const experienceVisibilityEnhancement = `
<script>
  (() => {
    const initExperienceVisibility = () => {
      const section = document.querySelector('#experiencia');
      if (!section) return;
      new IntersectionObserver(([entry]) => {
        document.body.dataset.experienceSectionVisible = String(entry.isIntersecting && entry.intersectionRatio >= .08);
      }, { threshold: [0, .08], rootMargin: '-58px 0px 0px 0px' }).observe(section);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initExperienceVisibility, { once: true });
    else initExperienceVisibility();
  })();
</script>`;

const realizationVisibilityEnhancement = `
<script>
  (() => {
    const initRealizationVisibility = () => {
      const section = document.querySelector('#coalizadoras');
      if (!section) return;
      new IntersectionObserver(([entry]) => {
        document.body.dataset.realizationSectionVisible = String(entry.isIntersecting && entry.intersectionRatio >= .08);
      }, { threshold: [0, .08], rootMargin: '-58px 0px 0px 0px' }).observe(section);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRealizationVisibility, { once: true });
    else initRealizationVisibility();
  })();
</script>`;

type AmplifyDayBrand = {
  name: string;
  src: string;
  width: number;
  height: number;
  maxWidth: string;
  maxHeight: string;
  scale?: number;
  x?: string;
  y?: string;
};

const amplifyDayBrands: AmplifyDayBrand[] = [
  { name: "UK Government", src: "/amplify-day/logos/uk-government.webp", width: 900, height: 111, maxWidth: "86%", maxHeight: "38%" },
  { name: "Grupo Primo", src: "/amplify-day/logos/grupo-primo.webp", width: 188, height: 85, maxWidth: "69%", maxHeight: "53%", scale: 1.2 },
  { name: "Sicoob", src: "/amplify-day/logos/sicoob.webp", width: 900, height: 236, maxWidth: "72%", maxHeight: "49%" },
  { name: "Ferrero", src: "/amplify-day/logos/ferrero.webp", width: 900, height: 114, maxWidth: "78%", maxHeight: "38%" },
  { name: "Amcham Brasil", src: "/amplify-day/logos/amcham.webp", width: 188, height: 85, maxWidth: "67%", maxHeight: "55%" },
  { name: "Embaixada da França no Brasil", src: "/amplify-day/logos/embaixada-franca.webp", width: 483, height: 500, maxWidth: "48%", maxHeight: "70%", y: "-5%" },
  { name: "Itaú", src: "/amplify-day/logos/itau.svg", width: 900, height: 900, maxWidth: "48%", maxHeight: "70%", scale: 1.08 },
  { name: "CEUB", src: "/amplify-day/logos/ceub.webp", width: 635, height: 347, maxWidth: "50%", maxHeight: "67%", scale: 1.2 },
  { name: "Rede D'Or São Luiz", src: "/amplify-day/logos/rede-dor.webp", width: 816, height: 500, maxWidth: "59%", maxHeight: "64%", scale: 1.14 },
  { name: "Sesc", src: "/amplify-day/logos/sesc.webp", width: 900, height: 450, maxWidth: "58%", maxHeight: "59%" },
  { name: "Universidade Federal de Goiás", src: "/amplify-day/logos/ufg.webp", width: 188, height: 85, maxWidth: "68%", maxHeight: "57%", scale: 1.16 },
  { name: "British Embassy", src: "/amplify-day/logos/british-embassy.webp", width: 659, height: 500, maxWidth: "52%", maxHeight: "67%" },
  { name: "Live University", src: "/amplify-day/logos/live-university.webp", width: 900, height: 162, maxWidth: "78%", maxHeight: "40%" },
  { name: "CREA-PR", src: "/amplify-day/logos/crea-pr.webp", width: 188, height: 85, maxWidth: "68%", maxHeight: "57%" },
  { name: "Tecfil", src: "/amplify-day/logos/tecfil.webp", width: 187, height: 85, maxWidth: "67%", maxHeight: "57%" },
  { name: "Gouvêa Ecosystem", src: "/amplify-day/logos/gouvea.webp", width: 188, height: 85, maxWidth: "67%", maxHeight: "57%" },
  { name: "Expanzio+", src: "/amplify-day/logos/expanzio.webp", width: 900, height: 147, maxWidth: "78%", maxHeight: "40%" },
  { name: "DWX", src: "/amplify-day/logos/dwx.webp", width: 188, height: 85, maxWidth: "69%", maxHeight: "57%", scale: 1.3 },
  { name: "Bossa Invest", src: "/amplify-day/logos/bossa-invest.webp", width: 188, height: 85, maxWidth: "67%", maxHeight: "55%", scale: 1.22 },
  { name: "Katsuki", src: "/amplify-day/logos/katsuki.webp", width: 188, height: 85, maxWidth: "70%", maxHeight: "50%", scale: 1.2 },
  { name: "Toccato", src: "/amplify-day/logos/toccato.webp", width: 188, height: 85, maxWidth: "67%", maxHeight: "57%" },
];

const brandPages = [amplifyDayBrands.slice(0, 7), amplifyDayBrands.slice(7, 14), amplifyDayBrands.slice(14, 21)].map((brands, pageIndex) => `
  <div class="brand-page" role="group" aria-label="Página ${pageIndex + 1} de 3" ${SCOPE}>
    ${brands.map((brand) => `<figure class="brand-mark" style="--logo-max-width:${brand.maxWidth};--logo-max-height:${brand.maxHeight};--logo-scale:${brand.scale ?? 1};--logo-x:${brand.x ?? "0"};--logo-y:${brand.y ?? "0"}" ${SCOPE}><img src="${brand.src}" alt="${brand.name}" width="${brand.width}" height="${brand.height}" loading="lazy" decoding="async" ${SCOPE}></figure>`).join("")}
  </div>`).join("");

const amplifyDaySpeakers = [
  {
    name: "Fernando Godoy",
    role: "Cofundador e CEO da Amplify",
    bio: "Empreendedor de tecnologia e inovação há mais de 25 anos no Brasil e nos Estados Unidos. Cofundador e CEO da Amplify e diretor de Inovação e Novos Negócios da X-VIA, fundou empresas pioneiras em experiências imersivas e educação digital. É autor, palestrante internacional e professor de IA para negócios. Engenheiro pela UNESP, tem MBA Executivo pelo Insper.",
    image: "/amplify-day/speakers/fernando-godoy.webp",
    width: 400,
    height: 600,
    position: "50% 30%",
  },
  {
    name: "Magno Maciel",
    role: "CEO do Grupo X-Via · Head Global do LIDE IA",
    bio: "CEO do Grupo X-Via e Head Global do LIDE Inteligência Artificial, é referência em dados e IA para gestão pública. Foi cofundador e CTO do Dashplan, sócio da Thermofy e diretor e coordenador de programas executivos de IA. Participou do Research Group da OpenAI, fundou o GA.IA e, desde 2018, já capacitou mais de 100 mil profissionais.",
    image: "/amplify-day/speakers/magno-maciel.webp",
    width: 800,
    height: 1200,
    position: "50% 30%",
  },
  {
    name: "Leonardo Camacho",
    role: "Doutorando · Educador de IA · Head de Soluções da Amplify",
    bio: "Doutorando pela Burgundy School of Business e mestre pela Fundação Dom Cabral, pesquisa inteligência artificial aplicada ao aprendizado organizacional, à estratégia e à performance de empresas de alto crescimento. Como executivo de receita e produto, implantou data science e IA em frentes de crescimento, go-to-market, analytics, gestão de produtos e operação comercial.",
    image: "/amplify-day/speakers/leonardo-camacho.webp",
    width: 1200,
    height: 675,
    position: "52% 46%",
  },
  {
    name: "Prof. Gilson Leal",
    role: "CEO da Shock Wave Academy",
    bio: "Fundador da Shock Wave Academy, a primeira escola permanente de Inteligência Artificial de Brasília, e professor de IA para Negócios no IDP. Depois de 25 anos no mercado criativo, passou a dedicar sua atuação à educação em IA. Já capacitou mais de 2 mil profissionais de organizações como ApexBrasil, Rede D’Or, Sicoob e Embaixada Britânica.",
    image: "/amplify-day/speakers/gilson-leal.webp",
    width: 800,
    height: 1200,
    position: "50% 28%",
  },
  {
    name: "Gustavo Corrêa",
    role: "CTO da X-Via",
    bio: "Engenheiro de Computação e CTO da X-Via, onde atua há oito anos liderando a transformação digital nos estados por meio da plataforma da empresa. Tem ampla experiência na gestão de projetos de tecnologia e inovação para o setor público, com foco na modernização de serviços, na eficiência operacional dos governos e na inteligência de dados apoiada por IA.",
    image: "/amplify-day/speakers/gustavo-correa.webp",
    width: 900,
    height: 943,
    position: "53% 28%",
  },
];

const experienceSection = `<section class="experience-refined" id="experiencia" aria-labelledby="experience-title" ${SCOPE}>
  <header class="experience-refined__header" ${SCOPE}>
    <span class="brand-fold__eyebrow" ${SCOPE}>02 · Edição 2026</span>
    <h2 id="experience-title" ${SCOPE}>Duas questões no centro dessa conversa.</h2>
  </header>
  <p class="experience-refined__intro" ${SCOPE}>Dois palcos, dois temas essenciais.</p>
  <div class="experience-refined__grid" aria-label="Palcos do Ampl_IA Day by X-Via" ${SCOPE}>
    <article class="experience-stage experience-stage--teia" ${SCOPE}>
      <p class="experience-stage__label" ${SCOPE}>Palco TEIA</p>
      <div class="experience-stage__art" aria-hidden="true" ${SCOPE}><svg viewBox="0 0 220 150" ${SCOPE}><path d="M14 128H206M98 24V128M107 24V128M113 24V128M122 24V128M28 128a26 14 0 0 1 52 0M140 128a26 14 0 0 0 52 0M14 60h192" ${SCOPE}/></svg></div>
      <div class="experience-stage__copy" ${SCOPE}><h3 ${SCOPE}>Painel: IA para gestão pública</h3><p ${SCOPE}>Como otimizar a gestão e o atendimento ao cidadão com IA.</p></div>
    </article>
    <article class="experience-stage experience-stage--xc" ${SCOPE}>
      <p class="experience-stage__label" ${SCOPE}>Palco Amplify</p>
      <div class="experience-stage__art" aria-hidden="true" ${SCOPE}><svg viewBox="0 0 220 150" ${SCOPE}><path d="M110 146C96 96 66 66 40 52M110 146C100 92 82 56 66 34M110 146C106 88 100 50 96 24M110 146C114 88 120 50 124 24M110 146C120 92 138 56 154 34M110 146C124 96 154 66 180 52M22 146h176" ${SCOPE}/></svg></div>
      <div class="experience-stage__copy" ${SCOPE}><h3 ${SCOPE}>O impacto da adoção de IA na educação.</h3><p ${SCOPE}>Como a IA está transformando a forma como aprendemos e ensinamos.</p></div>
    </article>
  </div>
  <p class="experience-refined__note" ${SCOPE}>Programação completa será divulgada em breve.</p>
</section>`;

const speakerCards = amplifyDaySpeakers.map((speaker, index) => `<article class="speaker-card" style="--speaker-x:${speaker.position.split(" ")[0]};--speaker-y:${speaker.position.split(" ")[1]}" ${SCOPE}>
  <span class="speaker-card__index" ${SCOPE}>${String(index + 1).padStart(2, "0")}</span>
  <figure class="speaker-card__media" ${SCOPE}><img src="${speaker.image}" alt="${speaker.name}" width="${speaker.width}" height="${speaker.height}" loading="lazy" decoding="async" ${SCOPE}></figure>
  <div class="speaker-card__identity" ${SCOPE}><h3 ${SCOPE}>${speaker.name}<span ${SCOPE}>${speaker.role}</span></h3></div>
  <p class="speaker-card__bio" ${SCOPE}>${speaker.bio}</p>
</article>`).join("");

const speakerSection = `<section class="speaker-fold brand-fold" id="palestrantes" aria-labelledby="speaker-title" ${SCOPE}>
  <header class="speaker-fold__header" ${SCOPE}>
    <div ${SCOPE}><span class="brand-fold__eyebrow" ${SCOPE}>04 · Palestrantes confirmados</span><h2 id="speaker-title" ${SCOPE}>Quem conduz a conversa.</h2></div>
    <div class="speaker-fold__header-side" ${SCOPE}><p class="speaker-fold__intro" ${SCOPE}>Cinco trajetórias entre negócios, educação e transformação digital.</p><button class="primary speaker-cta" type="button" data-open data-cta-position="speakers" data-conversion-anchor ${SCOPE}><span ${SCOPE}>${PUBLIC_CTA_LABEL}</span></button></div>
  </header>
  <div class="speaker-carousel" ${SCOPE}>
    <div class="speaker-track" data-speaker-track tabindex="0" aria-label="Palestrantes confirmados" ${SCOPE}>${speakerCards}</div>
    <div class="speaker-controls" ${SCOPE}>
      <button type="button" data-speaker-prev aria-label="Ver palestrantes anteriores" disabled ${SCOPE}><svg viewBox="0 0 24 24" aria-hidden="true" ${SCOPE}><path d="M15 5 8 12l7 7" ${SCOPE}/></svg></button>
      <span class="speaker-status" data-speaker-status aria-live="polite" ${SCOPE}>1–2 / 5</span>
      <button type="button" data-speaker-next aria-label="Ver próximos palestrantes" ${SCOPE}><svg viewBox="0 0 24 24" aria-hidden="true" ${SCOPE}><path d="m9 5 7 7-7 7" ${SCOPE}/></svg></button>
    </div>
  </div>
</section>`;

const faqSection = `<section class="faq section-shell" id="faq" ${SCOPE}>
  <header ${SCOPE}><span ${SCOPE}>07 · Perguntas frequentes</span><h2 ${SCOPE}>O que você precisa saber agora.</h2></header>
  <div class="faq-list" ${SCOPE}>
    <details ${SCOPE}><summary ${SCOPE}>Para quem é o Ampl_IA Day by X-Via?</summary><p ${SCOPE}>Para quem decide, lidera ou põe IA para funcionar.</p></details>
    <details ${SCOPE}><summary ${SCOPE}>O cadastro confirma minha participação?</summary><p ${SCOPE}>Não. As vagas são limitadas e sujeitas à disponibilidade. Se sua inscrição for confirmada, você receberá um código pessoal e intransferível.</p></details>
    <details ${SCOPE}><summary ${SCOPE}>Quando a programação e os palestrantes serão anunciados?</summary><p ${SCOPE}>Novos nomes e detalhes da programação serão divulgados em breve.</p><button class="faq-inline-cta" type="button" data-open data-cta-position="faq-lineup" data-conversion-anchor ${SCOPE}>${PUBLIC_CTA_LABEL} <span aria-hidden="true" ${SCOPE}>→</span></button></details>
    <details ${SCOPE}><summary ${SCOPE}>Onde e quando será realizado?</summary><p ${SCOPE}>O Ampl_IA Day by X-Via será realizado em 23 de setembro de 2026, no <a class="faq-venue-link" href="https://www.google.com/maps/search/?api=1&amp;query=Centro+de+Conven%C3%A7%C3%B5es+Ulysses+Guimar%C3%A3es+Bras%C3%ADlia" target="_blank" rel="noopener" ${SCOPE}>Centro de Convenções Ulysses Guimarães</a>, em Brasília.</p></details>
    <details ${SCOPE}><summary ${SCOPE}>Como receberei a confirmação e as próximas informações?</summary><p ${SCOPE}>A confirmação e o código pessoal de inscrição serão enviados por e-mail. Você também pode autorizar o uso do WhatsApp informado no cadastro para receber o status da inscrição e atualizações sobre o evento.</p></details>
  </div>
</section>`;

const brandSectionsPreview = `
${speakerSection}
<section class="brand-holding brand-fold" id="organizacoes" aria-labelledby="proof-title" ${SCOPE}>
  <header class="brand-holding__header" ${SCOPE}>
    <div ${SCOPE}><span class="brand-fold__eyebrow" ${SCOPE}>05 · Organizações</span><h2 id="proof-title" ${SCOPE}>Empresas em que já atuamos.</h2></div>
  </header>
  <div class="brand-holding__viewport" data-brand-carousel ${SCOPE}>
    <div class="brand-holding__track" data-brand-track tabindex="0" aria-label="Empresas em que já atuamos" ${SCOPE}>${brandPages}</div>
    <div class="brand-carousel__controls" ${SCOPE}>
      <button type="button" data-brand-prev aria-label="Ver marcas anteriores" disabled ${SCOPE}>←</button>
      <span class="brand-carousel__status" data-brand-status aria-live="polite" ${SCOPE}>1 / 3</span>
      <button type="button" data-brand-next aria-label="Ver próximas marcas" ${SCOPE}>→</button>
    </div>
  </div>
</section>
<section class="realization-fold brand-fold" id="coalizadoras" aria-labelledby="realization-title" ${SCOPE}>
  <figure class="realization-fold__image" aria-hidden="true" ${SCOPE}><img src="/_astro/candangos.9-ztqW0v.webp" alt="" loading="lazy" decoding="async" ${SCOPE}></figure>
  <header class="realization-fold__header" ${SCOPE}>
    <span class="brand-fold__eyebrow" ${SCOPE}>06 · Realização</span>
    <h2 id="realization-title" ${SCOPE}>Realização.</h2>
  </header>
  <div class="realization-grid" ${SCOPE}>
    <article class="realizer realizer--xvia" ${SCOPE}>
      <div class="realizer__mark" ${SCOPE}><img src="/_astro/xvia-white.ClfTZZ9-.png" alt="X-VIA" width="3426" height="774" loading="lazy" decoding="async" ${SCOPE}></div>
      <h3 ${SCOPE}>Tecnologia a serviço do cidadão.</h3>
      <p ${SCOPE}>Desde 2014, a X-VIA cria serviços digitais que aproximam governo e cidadão.</p>
    </article>
    <article class="realizer realizer--amplify" ${SCOPE}>
      <div class="realizer__mark" ${SCOPE}><img src="/_astro/logo-amplify-color.BWlawH-N.png" alt="Amplify" width="1301" height="204" loading="lazy" decoding="async" ${SCOPE}></div>
      <h3 ${SCOPE}>IA que vira capacidade de negócio.</h3>
      <p ${SCOPE}>A Amplify forma lideranças e equipes, desenha estratégias e implementa IA conectada ao trabalho real.</p>
    </article>
    <article class="realizer realizer--shock" ${SCOPE}>
      <div class="realizer__mark" ${SCOPE}><img src="/_astro/shockwave.7DdAxS2m.webp" alt="Shock Wave" width="500" height="331" loading="lazy" decoding="async" ${SCOPE}></div>
      <h3 ${SCOPE}>Criatividade e fluência em IA.</h3>
      <p ${SCOPE}>A Shock Wave une repertório, prática e negócio para tirar o ensino de IA do lugar-comum.</p>
    </article>
  </div>
  <div class="realization-support" aria-label="Apoios do Ampl_IA Day by X-Via" ${SCOPE}>
    <div class="realization-support__item" ${SCOPE}><span ${SCOPE}>Apoio</span><img src="/amplify-day/logos/xc-studio-black.webp" alt="XC Studio" width="301" height="296" loading="lazy" decoding="async" ${SCOPE}></div>
    <div class="realization-support__item" ${SCOPE}><span ${SCOPE}>Curadoria e apoio</span><strong ${SCOPE}>Espaço TEIA · Caixa Econômica Federal</strong></div>
  </div>
</section>`;

function replaceBrandSections(html: string) {
  return html.replace(
    /<section class="coalition section-shell" id="coalizadoras"[\s\S]*?<\/section>\s*<section class="proof section-shell" aria-labelledby="proof-title"[\s\S]*?<\/section>/i,
    brandSectionsPreview,
  );
}

const heroPartners = `<footer class="hero-foot hero-partners" ${SCOPE}>
  <div class="hero-partner-group" ${SCOPE}>
    <span class="hero-partner-label" ${SCOPE}>Realização</span>
    <div class="brands" aria-label="Realização: X-VIA, Amplify e Shock Wave" ${SCOPE}>
      <img class="xvia" src="/_astro/xvia-white.ClfTZZ9-.png" alt="X-VIA" width="3426" height="774" ${SCOPE}>
      <span aria-hidden="true" ${SCOPE}>+</span>
      <img class="amplify" src="/_astro/logo-amplify-color.BWlawH-N.png" alt="Amplify" width="1301" height="204" ${SCOPE}>
      <span aria-hidden="true" ${SCOPE}>+</span>
      <img class="shock" src="/_astro/shockwave.7DdAxS2m.webp" alt="Shock Wave" width="500" height="331" ${SCOPE}>
    </div>
  </div>
  <span class="hero-partner-separator" aria-hidden="true" ${SCOPE}></span>
  <div class="hero-support" ${SCOPE}>
    <img src="/amplify-day/logos/xc-studio-black.webp" alt="XC Studio" width="301" height="296" ${SCOPE}>
    <p class="hero-curation" ${SCOPE}><span ${SCOPE}>Curadoria e apoio</span><strong ${SCOPE}>Espaço TEIA · Caixa Econômica Federal</strong></p>
  </div>
</footer>`;

const leadStatusEnhancement = `
<style>
  .form .note.active[data-astro-cid-uieih2gt]{margin:4px 0 0;padding:12px 14px;border:1px solid rgba(11,14,12,.6);border-left:5px solid #08b7c7;background:rgba(8,183,199,.12);color:#0b0e0c;font:650 14px/1.35 Inter,sans-serif;letter-spacing:-.01em}
  .form .note.active[data-status="error"][data-astro-cid-uieih2gt]{border-color:#a3103d;border-left-color:#a3103d;background:rgba(163,16,61,.09);color:#79102f}
  .qualification-note[data-status="error"][data-astro-cid-uieih2gt]{margin-top:10px;padding:12px 14px;border:1px solid rgba(255,255,255,.86);border-left:5px solid #fff;background:rgba(11,14,12,.28);color:#fff;font:650 14px/1.35 Inter,sans-serif;letter-spacing:-.01em}
  .calendar-chooser[data-astro-cid-uieih2gt]{width:min(100%,560px);margin-top:18px;padding:18px;border:1px solid rgba(255,255,255,.72);background:rgba(11,14,12,.18);color:#fff}
  .calendar-chooser[hidden][data-astro-cid-uieih2gt]{display:none!important}
  .calendar-chooser__head[data-astro-cid-uieih2gt]{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:14px}
  .calendar-chooser__head[data-astro-cid-uieih2gt] strong[data-astro-cid-uieih2gt]{font:650 18px/1.12 "Bricolage Grotesque",sans-serif;letter-spacing:-.025em}
  .calendar-chooser__close[data-astro-cid-uieih2gt]{min-width:auto!important;width:30px!important;height:30px!important;padding:0!important;border:1px solid rgba(255,255,255,.65)!important;background:transparent!important;color:#fff!important;font:500 20px/1 Inter,sans-serif!important}
  .calendar-chooser__options[data-astro-cid-uieih2gt]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .calendar-chooser__option[data-astro-cid-uieih2gt]{display:flex!important;align-items:center!important;justify-content:center!important;min-height:54px!important;padding:10px 12px!important;border:1px solid #fff!important;background:#fff!important;color:#a3103d!important;text-align:center!important;text-decoration:none!important;font:700 11px/1.2 Inter,sans-serif!important;letter-spacing:.08em!important;text-transform:uppercase!important}
  .calendar-chooser__option[data-astro-cid-uieih2gt]:hover,.calendar-chooser__option[data-astro-cid-uieih2gt]:focus-visible{outline:3px solid #08b7c7;outline-offset:2px}
  .calendar-chooser__note[data-astro-cid-uieih2gt]{margin:12px 0 0!important;color:rgba(255,255,255,.82)!important;font:500 11px/1.4 Inter,sans-serif!important}
  @media(max-width:760px){.form .note.active[data-astro-cid-uieih2gt]{padding:13px 14px;font-size:15px;line-height:1.4}}
  @media(max-width:620px){.calendar-chooser__options[data-astro-cid-uieih2gt]{grid-template-columns:1fr}.calendar-chooser__option[data-astro-cid-uieih2gt]{justify-content:flex-start!important;text-align:left!important}.calendar-chooser[data-astro-cid-uieih2gt]{padding:16px}}
</style>
<script>
  (() => {
    const scope = 'data-astro-cid-uieih2gt';
    const persistTargetStage = () => {
      const params = new URLSearchParams(location.search);
      const attribution = [params.get('utm_campaign'), params.get('utm_content'), params.get('utm_term')]
        .filter(Boolean).join(' ').toLowerCase().replace(/[-_]+/g, ' ');
      const inferred = /\\bpalco\\s+teia\\b|\\bteia\\b/.test(attribution)
        ? 'teia'
        : (/\\bpalco\\s+amplify\\b/.test(attribution) ? 'amplify' : '');
      const requested = String(params.get('palco') || params.get('target_stage') || inferred || '').toLowerCase();
      if (!['amplify', 'teia'].includes(requested)) return;
      try {
        const key = 'amplify-day-lead';
        const current = JSON.parse(localStorage.getItem(key) || '{}');
        localStorage.setItem(key, JSON.stringify({ ...current, targetStage: requested, updatedAt: new Date().toISOString() }));
      } catch (_error) {}
    };
    persistTargetStage();
    const trackCalendar = (provider) => {
      const data = { provider };
      window.va?.('event', { name: 'amplify_day_calendar_selected', data });
      window.dispatchEvent(new CustomEvent('amplify:analytics', { detail: { eventName: 'amplify_day_calendar_selected', ...data } }));
    };
    const downloadCalendarFile = () => {
      const calendar = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Amplify//Amplify Day//PT-BR',
        'BEGIN:VEVENT', 'UID:amplify-day-2026@amplify.ia.br', 'DTSTAMP:20260831T120000Z',
        'DTSTART;VALUE=DATE:20260923', 'DTEND;VALUE=DATE:20260924',
        'SUMMARY:Amplify Day 2026', 'LOCATION:Ulysses Centro de Convenções\\, Brasília',
        'DESCRIPTION:Evento presencial Amplify Day.', 'URL:https://amplify.ia.br/amplify-day',
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\\r\\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
      link.download = 'amplify-day-2026.ics';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
    };
    const enhanceCalendar = () => {
      const trigger = document.querySelector('[data-calendar]');
      const actions = trigger?.closest('.thanks-actions');
      if (!trigger || !actions || document.querySelector('[data-calendar-chooser]')) return;

      const details = 'Um dia de imersão em inteligência artificial, conversas que geram decisão e palestrantes de impacto.';
      const location = 'Ulysses Centro de Convenções, Brasília - DF';
      const google = new URL('https://calendar.google.com/calendar/render');
      google.search = new URLSearchParams({ action: 'TEMPLATE', text: 'Amplify Day 2026', dates: '20260923/20260924', details, location }).toString();
      const outlook = new URL('https://outlook.office.com/calendar/0/deeplink/compose');
      outlook.search = new URLSearchParams({ subject: 'Amplify Day 2026', startdt: '2026-09-23T00:00:00', enddt: '2026-09-24T00:00:00', allday: 'true', body: details, location }).toString();

      const chooser = document.createElement('div');
      chooser.className = 'calendar-chooser';
      chooser.dataset.calendarChooser = '';
      chooser.id = 'calendar-chooser';
      chooser.hidden = true;
      chooser.setAttribute('role', 'dialog');
      chooser.setAttribute('aria-label', 'Escolher aplicativo de calendário');
      chooser.setAttribute(scope, '');
      chooser.innerHTML = '<div class="calendar-chooser__head" ' + scope + '><strong ' + scope + '>Onde você usa sua agenda?</strong><button class="calendar-chooser__close" type="button" aria-label="Fechar opções de calendário" data-calendar-close ' + scope + '>×</button></div><div class="calendar-chooser__options" ' + scope + '><a class="calendar-chooser__option" data-calendar-provider="google" target="_blank" rel="noopener" ' + scope + '>Google Agenda</a><a class="calendar-chooser__option" data-calendar-provider="outlook" target="_blank" rel="noopener" ' + scope + '>Outlook / Microsoft 365</a><button class="calendar-chooser__option" type="button" data-calendar-provider="ics" ' + scope + '>Apple / outro (.ics)</button></div><p class="calendar-chooser__note" ' + scope + '>O evento será aberto já preenchido. Você revisa e confirma no calendário escolhido.</p>';
      actions.insertAdjacentElement('afterend', chooser);

      const googleLink = chooser.querySelector('[data-calendar-provider="google"]');
      const outlookLink = chooser.querySelector('[data-calendar-provider="outlook"]');
      googleLink.href = google.toString();
      outlookLink.href = outlook.toString();
      trigger.setAttribute('aria-controls', chooser.id);
      trigger.setAttribute('aria-expanded', 'false');

      const close = () => {
        chooser.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      };
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        chooser.hidden = !chooser.hidden;
        trigger.setAttribute('aria-expanded', String(!chooser.hidden));
        if (!chooser.hidden) chooser.querySelector('[data-calendar-provider]')?.focus();
      }, true);
      chooser.querySelector('[data-calendar-close]').addEventListener('click', () => { close(); trigger.focus(); });
      googleLink.addEventListener('click', () => trackCalendar('google'));
      outlookLink.addEventListener('click', () => trackCalendar('outlook'));
      chooser.querySelector('[data-calendar-provider="ics"]').addEventListener('click', () => { trackCalendar('ics'); downloadCalendarFile(); });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !chooser.hidden) { close(); trigger.focus(); }
      });
    };
    const enhanceLeadStatus = () => {
      const note = document.querySelector('[data-note]');
      const qualificationNote = document.querySelector('[data-qualification-note]');
      [note, qualificationNote].filter(Boolean).forEach((status) => {
        const syncStatus = () => {
          const message = status.textContent || '';
          status.dataset.status = /não conseguimos|não foi possível|informe/i.test(message) ? 'error' : 'progress';
        };
        new MutationObserver(syncStatus).observe(status, { childList: true, characterData: true, subtree: true });
        syncStatus();
      });
      const qualificationForm = document.querySelector('[data-qualification-form]');
      const whatsapp = qualificationForm?.elements.namedItem('linkedin');
      qualificationForm?.addEventListener('submit', (event) => {
        const digits = String(whatsapp?.value || '').replace(/\\D/g, '');
        const valid = digits.length >= 10 && digits.length <= 13;
        whatsapp?.setAttribute('aria-invalid', String(!valid));
        const fieldError = qualificationForm.querySelector('[data-q-error="linkedin"]');
        if (fieldError) fieldError.hidden = valid;
        if (valid) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (qualificationNote) qualificationNote.textContent = 'Informe um WhatsApp válido, com DDD.';
        whatsapp?.focus();
      }, true);
      enhanceCalendar();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceLeadStatus, { once: true });
    else enhanceLeadStatus();
  })();
</script>`;

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .split("&").join("&amp;")
    .split("<").join("&lt;")
    .split(">").join("&gt;")
    .split('"').join("&quot;")
    .split("'").join("&#039;");
}

function applyEventRebrand(html: string) {
  return html
    .split("AMPLIFY DAY").join("AMPL_IA DAY BY X-VIA")
    .split("Amplify Day").join(EVENT_NAME)
    .replace(
      /(<a class="nav-brand"[^>]*>)Ampl_IA Day by X-Via(<\/a>)/i,
      `$1${brandLockup(true)}$2`,
    )
    .replace(
      /<p class="event-name"([^>]*)>Ampl_IA Day by X-Via<\/p>/i,
      `<p class="event-name"$1>${brandLockup()}</p>`,
    );
}

export function sanitizeAmplifyDayHtml(html: string) {
  const sanitized = replaceBrandSections(html)
    .replace(/<section class="experience[\s\S]*?<section class="city-transition/i, `${experienceSection}<section class="city-transition`)
    .replace(/<section class="city-transition[\s\S]*?<\/section>/i, "")
    .replace(/<section class="audience section-shell" id="para-quem"[\s\S]*?<\/section>/i, "")
    .replace(/<section class="faq section-shell" id="faq"[\s\S]*?<\/section>/i, faqSection)
    .replace(/<p class="purpose"[\s\S]*?<\/p>/i, "")
    .replace(/<span[^>]*aria-hidden="true"[^>]*>\+<\/span>\s*<img class="xvia"[^>]*>/gi, "")
    .replace(/Coalizadoras: Amplify, Shock(?: W|w)ave e X-VIA/g, "Realização: Amplify e Shock Wave")
    .split("04 · Local").join("03 · Local")
    .replace("Ulysses · Brasília", "Centro de Convenções Ulysses Guimarães · Brasília")
    .replace(/<p class="hero-audience"[^>]*>[\s\S]*?<\/p>/i, `<p class="hero-audience" ${SCOPE}>${EVENT_POSITIONING} <mark class="limited-highlight" ${SCOPE}>${EVENT_FORMAT_NOTICE}</mark></p>`)
    .replace(/<p class="cta-note"[^>]*>[\s\S]*?<\/p>/i, "")
    .replace(/<footer class="hero-foot"[\s\S]*?<\/footer>/i, heroPartners)
    .split("Não. O cadastro coloca seu nome na curadoria. Se houver encaixe, o convite chega por e-mail.").join("Não. O evento tem vagas limitadas e cada perfil passa por curadoria. Se aprovado, você recebe por e-mail a confirmação e seu código pessoal e intransferível.")
    .split("Se houver encaixe, o convite chega.").join("A gente avalia seu perfil. Se houver encaixe, a confirmação e o código chegam por e-mail.")
    .split("Seu nome e seu e-mail bastam para começar. O resto a gente pergunta depois.").join("Deixe seus dados para a curadoria. O cadastro não garante a vaga.")
    .split("Conte onde você trabalha e o que decide por lá. Isso ajuda a montar uma sala que faça sentido.").join("")
    .split("Deixe seu contato. A gente conhece seu perfil e avisa quando a curadoria abrir.").join("Deixe seu contato para a curadoria. O cadastro não garante a vaga.")
    .split("Recebemos seu perfil. Quando a curadoria abrir, você recebe notícias por e-mail.<strong data-astro-cid-uieih2gt> Até lá, reserve 23 de setembro.</strong>").join("Cadastro recebido. O Amplify Day tem vagas limitadas. Nosso time avaliará seu perfil e, se aprovado, enviará por e-mail a confirmação e seu código pessoal e intransferível de inscrição.")
    .split("03 · Lista prioritária").join("03 · Cadastro em análise")
    .replace(/(<section class="final-cta[\s\S]*?<h2[^>]*>)[\s\S]*?(<\/h2>)/i, `$1Queremos você<br ${SCOPE}>nessa conversa$2`)
    .replace(/(<section class="final-cta[\s\S]*?<\/h2>)\s*<p[^>]*>[\s\S]*?<\/p>/i, "$1")
    .split("Entrar na lista prioritária").join(PUBLIC_CTA_LABEL)
    .split("Lista prioritária").join(PUBLIC_CTA_LABEL)
    .split("Quero entrar").join(PUBLIC_CTA_LABEL)
    .replace(
      '<a href="#coalizadoras" data-astro-cid-uieih2gt>Coalizadoras</a>',
      '<a href="#coalizadoras" data-astro-cid-uieih2gt>Realização</a>',
    )
    .replace('<a href="#para-quem" data-astro-cid-uieih2gt>Para quem</a>', "")
    .replace(
      /<label[^>]*><span[^>]*>LinkedIn[\s\S]*?<\/label>/i,
      `<div class="whatsapp-field" ${SCOPE}><div class="whatsapp-field__head" ${SCOPE}><label for="amplify-day-whatsapp" ${SCOPE}>WhatsApp</label><details class="whatsapp-help" ${SCOPE}><summary ${SCOPE}>Por que pedimos?</summary><span class="whatsapp-help__bubble" id="whatsapp-rationale" role="tooltip" ${SCOPE}>Informe seu WhatsApp para entrarmos em contato com o status da sua inscrição.</span></details></div><input id="amplify-day-whatsapp" type="tel" name="linkedin" autocomplete="tel" inputmode="tel" placeholder="(61) 99999-9999" aria-describedby="whatsapp-rationale whatsapp-help" required ${SCOPE}><small id="whatsapp-help" data-q-error="linkedin" hidden ${SCOPE}>Informe um WhatsApp válido.</small></div>`,
    )
    // The approved export referenced two responsive venue files that were not
    // included in the project. Keep one real source so browsers never select a
    // missing candidate and leave the location fold blank.
    .replace(/<source[^>]+ulysses-640\.avif[^>]*>/i, "")
    .replace(
      /<source[^>]+ulysses-640\.webp[^>]*>/i,
      '<source srcset="/amplify-day/venue/ulysses-1080.webp" type="image/webp" sizes="(max-width: 760px) 100vw, 58vw" data-astro-cid-uieih2gt>',
    )
    .replace("</head>", `${brandPreviewStyles}${brandCarouselEnhancement}${speakerCarouselEnhancement}${experienceVisibilityEnhancement}${realizationVisibilityEnhancement}${leadStatusEnhancement}</head>`);
  return applyEventRebrand(sanitized);
}

function alignInvitationContent(html: string) {
  return html
    .split("A participação é mediante convite e está sujeita à disponibilidade.")
    .join("Seu convite é nominal. Confirme sua presença para concluir a inscrição.")
    .split("O cadastro confirma minha participação?")
    .join("Como confirmo minha participação?")
    .split("Não. As vagas são limitadas e sujeitas à disponibilidade. Se sua inscrição for confirmada, você receberá um código pessoal e intransferível.")
    .join("Preencha empresa e cargo e confirme sua presença. Ao concluir, seu código pessoal e intransferível será validado.")
    .split("Inscreva-se para receber atualizações")
    .join("Confirme para receber atualizações")
    .split("Nosso grupo de networking entrará em contato para construirmos juntos a melhor forma de participação.")
    .join("Seu convite já está reservado. Confirme sua presença para concluir a inscrição.");
}

const nominalStyles = `
<style>
  .nominal-action[data-astro-cid-uieih2gt]{overflow:hidden;padding:clamp(18px,2.6vh,28px) clamp(20px,2.25vw,34px) clamp(16px,2.4vh,26px)}
  .nominal-action .save[data-astro-cid-uieih2gt]{grid-template-columns:22px 1fr;gap:8px}
  .nominal-action .save[data-astro-cid-uieih2gt]>span[data-astro-cid-uieih2gt]{margin-top:4px}
  .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]{overflow-wrap:anywhere;font-size:clamp(34px,2.72vw,48px)!important;line-height:.87!important;letter-spacing:-.06em!important;text-wrap:balance}
  .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]:after{width:28%;height:4px;margin-top:10px}
  .nominal-intro[data-astro-cid-uieih2gt]{max-width:430px;margin:12px 0 0;font:550 clamp(16px,1.12vw,19px)/1.1 "Bricolage Grotesque",sans-serif;letter-spacing:-.035em}
  .nominal-message[data-astro-cid-uieih2gt]{position:relative;margin:12px 0 0;border-left:4px solid var(--cyan);padding:10px 12px;background:rgba(8,183,199,.08)}
  .nominal-message[data-astro-cid-uieih2gt] span[data-astro-cid-uieih2gt]{display:block;margin-bottom:6px;color:rgba(11,14,12,.58);font:700 8px/1 Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase}
  .nominal-message[data-astro-cid-uieih2gt] blockquote[data-astro-cid-uieih2gt]{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3;margin:0;font:550 clamp(12px,.88vw,14px)/1.3 "Bricolage Grotesque",sans-serif;letter-spacing:-.018em}
  .nominal-message__more[data-astro-cid-uieih2gt]{margin:7px 0 0;border:0;border-bottom:1px solid currentColor;padding:0 0 2px;color:var(--ink);background:transparent;font:700 8px/1 Inter,sans-serif;letter-spacing:.11em;text-transform:uppercase;cursor:pointer}
  .nominal-message__more[data-astro-cid-uieih2gt]:focus-visible{outline:2px solid var(--cyan);outline-offset:3px}
  .nominal-inviter[data-astro-cid-uieih2gt]{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:baseline;gap:0 10px;margin:10px 0 0;padding:9px 0 0;border-top:1px solid var(--soft)}
  .nominal-inviter[data-astro-cid-uieih2gt]>span[data-astro-cid-uieih2gt]{color:var(--cyan);font:700 8px/1 Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase}
  .nominal-inviter[data-astro-cid-uieih2gt] strong[data-astro-cid-uieih2gt]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:650 12px/1.1 "Bricolage Grotesque",sans-serif}
  .nominal-inviter[data-astro-cid-uieih2gt] small[data-astro-cid-uieih2gt]{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(11,14,12,.62);font:550 9px/1.2 Inter,sans-serif}
  .nominal-form[data-astro-cid-uieih2gt]{display:grid;flex-shrink:0;grid-template-columns:1fr 1fr;gap:6px 8px;margin-top:auto;padding-top:10px}
  .nominal-form[data-astro-cid-uieih2gt] label[data-astro-cid-uieih2gt]{display:block}
  .nominal-form[data-astro-cid-uieih2gt] label[data-astro-cid-uieih2gt] span[data-astro-cid-uieih2gt]{display:block;margin-bottom:4px;font:700 8px/1 Inter,sans-serif;letter-spacing:.11em;text-transform:uppercase}
  .nominal-form[data-astro-cid-uieih2gt] input[data-astro-cid-uieih2gt]{width:100%;height:36px;min-height:36px;border:1px solid var(--line);border-radius:0;padding:0 9px;overflow:hidden;text-overflow:ellipsis;background:transparent;color:var(--ink);font:500 11px/1 Inter,sans-serif}
  .nominal-form[data-astro-cid-uieih2gt] input[readonly][data-astro-cid-uieih2gt]{color:rgba(11,14,12,.58);background:rgba(11,14,12,.04)}
  .nominal-form[data-astro-cid-uieih2gt] input[data-astro-cid-uieih2gt]:focus{outline:2px solid var(--cyan);outline-offset:1px}
  .nominal-form[data-astro-cid-uieih2gt] .primary[data-astro-cid-uieih2gt]{grid-column:1/-1;width:100%;height:50px;min-height:50px;margin-top:2px}
  .nominal-note[data-astro-cid-uieih2gt]{grid-column:1/-1;margin:0;font:500 8px/1.25 Inter,sans-serif;color:rgba(11,14,12,.58)}
  .nominal-error[data-astro-cid-uieih2gt]{grid-column:1/-1;margin:0;color:#a3103d;font:650 11px/1.35 Inter,sans-serif}
  .nominal-confirmed[data-astro-cid-uieih2gt]{margin-top:18px;padding:16px;border:1px solid var(--line);background:rgba(8,183,199,.1)}
  .nominal-confirmed[hidden][data-astro-cid-uieih2gt]{display:none!important}
  .nominal-confirmed[data-astro-cid-uieih2gt] span[data-astro-cid-uieih2gt]{display:block;font:700 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase}
  .nominal-confirmed[data-astro-cid-uieih2gt] strong[data-astro-cid-uieih2gt]{display:block;margin-top:9px;font:700 28px/1 "Bricolage Grotesque",sans-serif;letter-spacing:.05em}
  .nominal-confirmed[data-astro-cid-uieih2gt] p[data-astro-cid-uieih2gt]{margin:9px 0 0;font:500 11px/1.4 Inter,sans-serif}
  .nominal-invalid[data-astro-cid-uieih2gt] .primary[data-astro-cid-uieih2gt]{display:flex;margin-top:22px;text-decoration:none}
  .nominal-message-dialog[data-astro-cid-uieih2gt]{width:min(520px,calc(100vw - 32px));max-height:min(620px,calc(100dvh - 32px));border:1px solid var(--ink);padding:0;color:var(--ink);background:var(--paper);box-shadow:8px 8px 0 var(--pink-carmine)}
  .nominal-message-dialog[data-astro-cid-uieih2gt]::backdrop{background:rgba(11,14,12,.66);backdrop-filter:blur(3px)}
  .nominal-message-dialog__head[data-astro-cid-uieih2gt]{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding:15px 18px;color:var(--cyan);font:700 9px/1 Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase}
  .nominal-message-dialog__head[data-astro-cid-uieih2gt] button[data-astro-cid-uieih2gt]{border:0;padding:4px;color:var(--ink);background:transparent;font:700 10px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
  .nominal-message-dialog[data-astro-cid-uieih2gt] blockquote[data-astro-cid-uieih2gt]{max-height:calc(100dvh - 120px);overflow:auto;margin:0;padding:24px;font:550 clamp(18px,2vw,24px)/1.3 "Bricolage Grotesque",sans-serif;letter-spacing:-.025em}
  @media(min-width:1101px) and (min-height:800px){
    .hero[data-astro-cid-uieih2gt]{grid-template-columns:minmax(0,1.42fr) minmax(230px,.6fr) minmax(300px,.78fr)}
    .hero-date[data-astro-cid-uieih2gt]{grid-template-columns:minmax(0,1fr) clamp(118px,8vw,150px);align-items:stretch;padding-right:clamp(16px,1.7vw,28px);padding-left:clamp(8px,1.2vw,18px)}
    .hero-date .field[data-astro-cid-uieih2gt]{width:100%;max-width:none;height:100%;max-height:none}
    .hero-date .core[data-astro-cid-uieih2gt],.hero-date .echo[data-astro-cid-uieih2gt]{top:46%;left:48%;font-size:min(36vw,68vh,560px)}
    .hero-date .date-caption[data-astro-cid-uieih2gt]{align-self:center}
  }
  @media(max-height:900px) and (min-width:761px){
    .nominal-action[data-astro-cid-uieih2gt]{padding-top:16px;padding-bottom:14px}
    .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]{font-size:clamp(31px,2.45vw,42px)!important}
    .nominal-intro[data-astro-cid-uieih2gt]{margin-top:9px;font-size:15px}
    .nominal-message[data-astro-cid-uieih2gt]{margin-top:9px;padding-top:8px;padding-bottom:8px}
    .nominal-message[data-astro-cid-uieih2gt] blockquote[data-astro-cid-uieih2gt]{-webkit-line-clamp:2;font-size:12px}
    .nominal-inviter[data-astro-cid-uieih2gt]{margin-top:8px;padding-top:7px}
    .nominal-form[data-astro-cid-uieih2gt]{padding-top:8px}
    .nominal-form[data-astro-cid-uieih2gt] input[data-astro-cid-uieih2gt]{height:33px;min-height:33px}
    .nominal-form[data-astro-cid-uieih2gt] .primary[data-astro-cid-uieih2gt]{height:46px;min-height:46px}
  }
  @media(max-height:740px) and (min-width:761px){
    .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]{font-size:30px!important}
    .nominal-intro[data-astro-cid-uieih2gt]{font-size:13px}
    .nominal-message[data-astro-cid-uieih2gt] span[data-astro-cid-uieih2gt]{display:none}
    .nominal-message[data-astro-cid-uieih2gt] blockquote[data-astro-cid-uieih2gt]{-webkit-line-clamp:1}
    .nominal-note[data-astro-cid-uieih2gt]{display:none}
  }
  @media(max-width:760px){
    .hero[data-astro-cid-uieih2gt]{height:auto!important;min-height:0!important;grid-template-rows:auto 0 auto auto!important;overflow:visible}
    .hero-date[data-astro-cid-uieih2gt]{display:none!important}
    .nominal-action[data-astro-cid-uieih2gt]{grid-row:3;overflow:visible;padding:18px 0 20px}
    .nominal-action .save[data-astro-cid-uieih2gt]{display:grid!important}
    .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]{font-size:clamp(34px,10.5vw,46px)!important}
    .nominal-intro[data-astro-cid-uieih2gt]{font-size:18px}
    .nominal-form[data-astro-cid-uieih2gt]{grid-template-columns:1fr}
    .nominal-form[data-astro-cid-uieih2gt] .primary[data-astro-cid-uieih2gt],.nominal-note[data-astro-cid-uieih2gt],.nominal-error[data-astro-cid-uieih2gt]{grid-column:1}
    .nominal-inviter[data-astro-cid-uieih2gt]{grid-template-columns:auto minmax(0,1fr)}
    .nominal-inviter[data-astro-cid-uieih2gt] small[data-astro-cid-uieih2gt]{grid-column:2}
  }
  @media(max-width:390px){
    .nominal-action .save[data-astro-cid-uieih2gt] h1[data-astro-cid-uieih2gt]:after{margin-top:6px}
    .nominal-intro[data-astro-cid-uieih2gt]{margin-top:9px;font-size:16px;line-height:1.08}
    .nominal-message[data-astro-cid-uieih2gt]{margin-top:9px;padding-top:8px;padding-bottom:8px}
    .nominal-inviter[data-astro-cid-uieih2gt]{margin-top:7px;padding-top:7px}
    .nominal-form[data-astro-cid-uieih2gt]{padding-top:7px}
  }
</style>`;

type InvitationView = {
  token: string;
  invitation: any;
};

function invitationAside({ token, invitation }: InvitationView) {
  const inviter = invitation.inviter;
  const firstName = getPreferredName(invitation.guest_name);
  // The landing page only shows the note written for this specific guest.
  // The inviter's base message belongs to the copied WhatsApp/email text and
  // must not silently become page content.
  const personalMessage = String(invitation.personal_message || "").trim();
  const hasLongPersonalMessage = personalMessage.length > 105;
  const confirmed = invitation.status === "confirmed";

  return `<aside class="hero-action nominal-action" ${SCOPE}>
    <div class="save" ${SCOPE}><span ${SCOPE}>01</span><h1 ${SCOPE}>${escapeHtml(firstName)},<br ${SCOPE}>seu convite para o Ampl_IA Day by X-Via está reservado.</h1></div>
    <p class="nominal-intro" ${SCOPE}>Um convite pessoal para ${EVENT_POSITIONING.charAt(0).toLowerCase()}${EVENT_POSITIONING.slice(1)} <mark class="limited-highlight" ${SCOPE}>${EVENT_FORMAT_NOTICE}</mark></p>
    ${personalMessage ? `<div class="nominal-message" ${SCOPE}><span ${SCOPE}>${escapeHtml(inviter.name)} convidou você para participar desta conversa</span><blockquote ${SCOPE}>${escapeHtml(personalMessage)}</blockquote>${hasLongPersonalMessage ? `<button class="nominal-message__more" type="button" data-message-open ${SCOPE}>Ler mensagem completa</button>` : ""}</div>` : ""}
    <div class="nominal-inviter" ${SCOPE}>
      <span ${SCOPE}>A convite de</span>
      <strong ${SCOPE}>${escapeHtml(inviter.name)}</strong>
      <small ${SCOPE}>${escapeHtml(inviter.role)} · ${escapeHtml(inviter.company)}</small>
    </div>
    ${confirmed ? `<div class="nominal-confirmed" ${SCOPE}><span ${SCOPE}>Presença confirmada</span><strong ${SCOPE}>${escapeHtml(invitation.code)}</strong><p ${SCOPE}>Seu convite é pessoal e intransferível. As próximas orientações chegarão por e-mail.</p></div>` : `<form class="nominal-form" data-invite-form data-token="${escapeHtml(token)}"${invitation.preview_mode ? ' data-preview="true"' : ""} ${SCOPE}>
      <label ${SCOPE}><span ${SCOPE}>Nome</span><input value="${escapeHtml(invitation.guest_name)}" readonly aria-readonly="true" ${SCOPE}></label>
      <label ${SCOPE}><span ${SCOPE}>Email</span><input type="email" value="${escapeHtml(invitation.guest_email)}" readonly aria-readonly="true" ${SCOPE}></label>
      <label ${SCOPE}><span ${SCOPE}>Empresa</span><input name="company" value="${escapeHtml(invitation.guest_company)}" autocomplete="organization" required ${SCOPE}></label>
      <label ${SCOPE}><span ${SCOPE}>Cargo</span><input name="role" value="${escapeHtml(invitation.guest_role)}" autocomplete="organization-title" required ${SCOPE}></label>
      <p class="nominal-error" data-invite-error role="alert" hidden ${SCOPE}></p>
      <button class="primary" type="submit" data-invite-submit ${SCOPE}><span ${SCOPE}>${INVITATION_CTA_LABEL}</span></button>
      <p class="nominal-note" ${SCOPE}>Convite pessoal e intransferível · Código ${escapeHtml(invitation.code)}</p>
      <div class="nominal-confirmed" data-invite-success hidden ${SCOPE}><span ${SCOPE}>Presença confirmada</span><strong ${SCOPE}>${escapeHtml(invitation.code)}</strong><p ${SCOPE}>Enviamos a confirmação e as informações do evento para seu e-mail.</p></div>
    </form>`}
    ${hasLongPersonalMessage ? `<dialog class="nominal-message-dialog" data-message-dialog ${SCOPE}><div class="nominal-message-dialog__head" ${SCOPE}><span ${SCOPE}>Mensagem de ${escapeHtml(inviter.name)}</span><button type="button" data-message-close ${SCOPE}>Fechar</button></div><blockquote ${SCOPE}>${escapeHtml(personalMessage)}</blockquote></dialog>` : ""}
  </aside>`;
}

function invalidAside() {
  return `<aside class="hero-action nominal-action nominal-invalid" ${SCOPE}>
    <div class="save" ${SCOPE}><span ${SCOPE}>01</span><h1 ${SCOPE}>Convite<br ${SCOPE}>indisponível</h1></div>
    <p class="hero-audience" ${SCOPE}>Este link pode ter expirado ou sido revogado. Fale com a pessoa que enviou o convite para receber ajuda.</p>
    <a class="primary" href="/amplify-day" ${SCOPE}><span ${SCOPE}>Conhecer o Ampl_IA Day by X-Via</span></a>
  </aside>`;
}

const invitationScript = `<script type="module">
  const form = document.querySelector('[data-invite-form]');
  const messageDialog = document.querySelector('[data-message-dialog]');
  document.querySelector('[data-message-open]')?.addEventListener('click', () => messageDialog?.showModal());
  document.querySelector('[data-message-close]')?.addEventListener('click', () => messageDialog?.close());
  messageDialog?.addEventListener('click', (event) => { if (event.target === messageDialog) messageDialog.close(); });
  document.querySelectorAll('[data-jump-invite]').forEach((button) => button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })));
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const company = form.elements.namedItem('company');
    const role = form.elements.namedItem('role');
    const error = form.querySelector('[data-invite-error]');
    const submit = form.querySelector('[data-invite-submit]');
    if (!company?.value.trim() || !role?.value.trim()) {
      error.textContent = 'Preencha empresa e cargo.';
      error.hidden = false;
      (!company?.value.trim() ? company : role)?.focus();
      return;
    }
    error.hidden = true;
    submit.disabled = true;
    submit.querySelector('span').textContent = 'Confirmando...';
    if (form.dataset.preview === 'true') {
      Array.from(form.children).forEach((child) => { if (!child.matches('[data-invite-success]')) child.hidden = true; });
      form.querySelector('[data-invite-success]').hidden = false;
      return;
    }
    try {
      const response = await fetch('/api/amplify-day-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: form.dataset.token, company: company.value.trim(), role: role.value.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível confirmar.');
      Array.from(form.children).forEach((child) => { if (!child.matches('[data-invite-success]')) child.hidden = true; });
      form.querySelector('[data-invite-success]').hidden = false;
    } catch (requestError) {
      error.textContent = requestError instanceof Error ? requestError.message : 'Não foi possível confirmar agora.';
      error.hidden = false;
      submit.disabled = false;
      submit.querySelector('span').textContent = '${INVITATION_CTA_LABEL}';
    }
  });
</script>`;

export function renderInvitationHtml(baseHtml: string, resolved: any, token: string) {
  let html = alignInvitationContent(sanitizeAmplifyDayHtml(baseHtml))
    .split("Ampl_IA Day by X-Via 2026 | Reserve a data").join("Seu convite para o Ampl_IA Day by X-Via 2026")
    .split(PUBLIC_CTA_LABEL).join(INVITATION_CTA_LABEL)
    .split("data-open").join("data-jump-invite");
  const aside = resolved?.ok ? invitationAside({ token, invitation: resolved.invitation }) : invalidAside();
  html = html.replace(/<aside class="hero-action"[\s\S]*?<\/aside>/, aside);
  html = html.replace("</head>", `${nominalStyles}</head>`);
  html = html.replace("</body>", `${invitationScript}</body>`);
  return applyEventRebrand(html);
}
