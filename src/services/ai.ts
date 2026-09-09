import { AI, environment } from "@raycast/api";
import { planningPrompt, parseProposal } from "../lib/proposal";
import { selectContext } from "../lib/history";
import type { PlanningContext } from "../lib/types";
export async function propose(context: PlanningContext, signal: AbortSignal) {
  if (!environment.canAccess(AI))
    throw new Error(
      "This command requires access to Raycast AI. No API key is needed.",
    );
  const selected = selectContext(context);
  const result = await AI.ask(planningPrompt(selected), {
    creativity: "none",
    signal,
  });
  return { result: parseProposal(result, selected), context: selected };
}
