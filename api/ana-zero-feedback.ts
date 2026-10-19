import { handleAnaZeroFeedback } from "../src/lib/ana-zero/feedback-http.js";
import { scheduleAutomaticAnalysis } from "../src/lib/ana-zero/automatic-analysis.js";

export async function POST(request: Request) {
  return handleAnaZeroFeedback(request, undefined, undefined, scheduleAutomaticAnalysis);
}
