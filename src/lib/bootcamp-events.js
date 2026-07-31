const BOOTCAMP_SLUG_ALIASES = {
  "natal-23-07-26": "natal-24-07-26",
  "natal-25-07-26": "natal-24-07-26",
  "crea-rn-25-07-26": "crea-rn-24-08-26",
};

export const BOOTCAMP_EVENTS = [
  {
    slug: "cidade-dd-mm-aa",
    city: "Cidade",
    date: "dd/mm/aa",
    venue: "Local a confirmar",
    address: "Endereço a confirmar",
    startTime: "09:00",
    endTime: "18:00",
    symplaEventId: "",
    symplaCheckoutUrl: "https://www.sympla.com.br/",
    whatsappGroupUrl: "https://chat.whatsapp.com/",
    version: "branding",
    localContext: "o ritmo real de quem trabalha, decide e cria na cidade",
  },
  {
    slug: "sao-paulo-24-08-26",
    city: "São Paulo",
    date: "24/08/26",
    venue: "Local a confirmar",
    address: "São Paulo, SP",
    startTime: "09:00",
    endTime: "18:00",
    symplaEventId: "",
    symplaCheckoutUrl: "https://www.sympla.com.br/",
    whatsappGroupUrl: "https://chat.whatsapp.com/",
    version: "cidade",
    localContext: "o ritmo de negócios, tecnologia e serviços de São Paulo",
  },
  {
    slug: "natal-24-07-26",
    city: "Natal",
    date: "24/07/26",
    venue: "Arena das Dunas",
    address: "Av. Prudente de Morais, 5121 - Lagoa Nova, Natal - RN, 59064-625, Brazil",
    startTime: "09:00",
    endTime: "18:00",
    symplaEventId: "3426958",
    symplaCheckoutUrl: "https://www.sympla.com.br/evento/bootcamp-ia-para-negocios-natal/3426958",
    whatsappGroupUrl: "https://wa.me/5511950350002?text=Ol%C3%A1%20Adriano%2C%20gostaria%20de%20falar%20sobre%20possibilidade%20de%20patrocinar%20o%20Bootcamp%20IA%20para%20neg%C3%B3cios%20em%20Natal",
    version: "cidade",
    localContext: "a energia de uma cidade costeira que conecta turismo, serviços, criatividade e novos negócios",
  },
  {
    slug: "crea-rn-24-08-26",
    city: "Natal",
    date: "24/08/26",
    venue: "CREA-RN",
    address: "Av. Sen. Salgado Filho, 1840 - Lagoa Nova, Natal - RN",
    startTime: "09:00",
    endTime: "18:00",
    symplaEventId: "",
    symplaCheckoutUrl: "",
    whatsappGroupUrl: "https://wa.me/5511950350002?text=Ol%C3%A1%20Adriano%2C%20gostaria%20de%20falar%20sobre%20o%20Bootcamp%20Engineering%20AI%20Experience%20Natal%20no%20CREA-RN.",
    version: "branding",
    localContext: "o contexto técnico de engenharia, agronomia, geociências, fiscalização, empresas registradas e responsabilidade profissional no Rio Grande do Norte",
  },
  {
    slug: "crc-rn-25-08-26",
    city: "Natal",
    date: "25/08/26",
    venue: "CRC-RN",
    address: "Avenida Nevaldo Rocha (antiga Bernardo Vieira), 4545, Bairro Tirol, Natal - RN",
    startTime: "A confirmar",
    endTime: "",
    symplaEventId: "",
    symplaCheckoutUrl: "",
    whatsappGroupUrl: "https://wa.me/5511950350002?text=Ol%C3%A1%20Adriano%2C%20gostaria%20de%20falar%20sobre%20o%20Bootcamp%20IA%20para%20Neg%C3%B3cios%20Cont%C3%A1beis%20no%20CRC-RN.",
    version: "branding",
    localContext: "o contexto de escritórios contábeis, departamentos financeiros, rotinas fiscais, atendimento a clientes e gestão contábil no Rio Grande do Norte",
  },
];

function clean(value) {
  return String(value || "").trim();
}

export function getCanonicalBootcampSlug(slug) {
  const cleanSlug = clean(slug).toLowerCase();
  return BOOTCAMP_SLUG_ALIASES[cleanSlug] || cleanSlug;
}

export function getBootcampEventBySlug(slug) {
  const canonicalSlug = getCanonicalBootcampSlug(slug);
  return BOOTCAMP_EVENTS.find((event) => event.slug === canonicalSlug) || null;
}

export function getBootcampCheckoutUrl(event, currentUrl) {
  const baseUrl = clean(event?.symplaCheckoutUrl);
  if (!baseUrl) return "";

  try {
    const checkoutUrl = new URL(baseUrl);
    const sourceUrl = currentUrl ? new URL(currentUrl) : null;
    const utmParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

    utmParams.forEach((param) => {
      const value = sourceUrl?.searchParams.get(param);
      if (value && !checkoutUrl.searchParams.has(param)) {
        checkoutUrl.searchParams.set(param, value);
      }
    });

    if (!checkoutUrl.searchParams.has("utm_source")) {
      checkoutUrl.searchParams.set("utm_source", "amplify");
    }

    if (!checkoutUrl.searchParams.has("utm_medium")) {
      checkoutUrl.searchParams.set("utm_medium", "lp_bootcamp");
    }

    if (!checkoutUrl.searchParams.has("utm_campaign")) {
      checkoutUrl.searchParams.set("utm_campaign", `bootcamp_${event.slug}`);
    }

    return checkoutUrl.toString();
  } catch (_error) {
    return baseUrl;
  }
}

export function getBootcampPublicConfig(event) {
  if (!event) return null;

  return {
    slug: event.slug,
    city: event.city,
    date: event.date,
    venue: event.venue,
    address: event.address,
    startTime: event.startTime,
    endTime: event.endTime,
    symplaEventId: event.symplaEventId,
    symplaCheckoutUrl: event.symplaCheckoutUrl,
    whatsappGroupUrl: event.whatsappGroupUrl,
    version: event.version,
    localContext: event.localContext,
  };
}
