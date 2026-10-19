import type { APIRoute } from "astro";
import { handleAnaLab } from "@/lib/ana-zero/lab/http";

export const prerender = false;

export const GET: APIRoute = ({ request }) => handleAnaLab(request);
export const POST: APIRoute = ({ request }) => handleAnaLab(request);
export const DELETE: APIRoute = ({ request }) => handleAnaLab(request);
