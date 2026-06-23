import handler from "../../../api/nexialista-checkout.js";

export const prerender = false;

function syncServerEnv() {
  const keys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_NEXIALISTA_127",
    "STRIPE_PRICE_NEXIALISTA_67",
    "STRIPE_PRICE_NEXIALISTA_37",
    "DATABASE_URL",
    "KIT_API_KEY",
  ];

  keys.forEach((key) => {
    if (!process.env[key] && import.meta.env?.[key]) {
      process.env[key] = import.meta.env?.[key];
    }
  });
}

export async function POST({ request }) {
  syncServerEnv();
  return handler(request);
}
