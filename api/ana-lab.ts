import { handleAnaLab } from "../src/lib/ana-zero/lab/http.js";

export async function GET(request: Request) {
  return handleAnaLab(request);
}

export async function POST(request: Request) {
  return handleAnaLab(request);
}

export async function DELETE(request: Request) {
  return handleAnaLab(request);
}
