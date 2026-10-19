import { handleAnaZeroAdmin } from "../src/lib/ana-zero/admin/http.js";

export async function GET(request: Request) {
  return handleAnaZeroAdmin(request);
}

export async function POST(request: Request) {
  return handleAnaZeroAdmin(request);
}
