import type { APIRoute } from "astro";
import { handleAnaZeroAdmin } from "@/lib/ana-zero/admin/http";

export const prerender = false;

export const GET: APIRoute = ({ request }) => handleAnaZeroAdmin(request);
export const POST: APIRoute = ({ request }) => handleAnaZeroAdmin(request);
