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
    slug: "natal-25-07-26",
    city: "Natal",
    date: "25/07/26",
    venue: "Local a confirmar",
    address: "Natal, RN",
    startTime: "09:00",
    endTime: "18:00",
    symplaEventId: "",
    symplaCheckoutUrl: "https://www.sympla.com.br/",
    whatsappGroupUrl: "https://chat.whatsapp.com/",
    version: "cidade",
    localContext: "a energia de uma cidade costeira que conecta turismo, serviços, criatividade e novos negócios",
  },
];

function clean(value) {
  return String(value || "").trim();
}

export function getBootcampEventBySlug(slug) {
  const cleanSlug = clean(slug).toLowerCase();
  return BOOTCAMP_EVENTS.find((event) => event.slug === cleanSlug) || null;
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
