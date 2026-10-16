import { handleAnaFeedback } from "../src/lib/ana/feedback.js";

export async function POST(request: Request) {
  return handleAnaFeedback(request);
}
