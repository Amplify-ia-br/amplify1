import { handleAnaZeroFeedback } from "../src/lib/ana-zero/feedback-http.js";

export async function POST(request: Request) {
  return handleAnaZeroFeedback(request);
}
