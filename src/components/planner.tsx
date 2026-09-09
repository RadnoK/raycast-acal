import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { readHistory } from "../services/calendar-history";
import { propose } from "../services/ai";
import { loadTranscript } from "../services/fireflies";
import type { Conversation, PlanningContext, Transcript } from "../lib/types";
import { message } from "../lib/display";
import ProposalReview from "./proposal-review";
import Connections from "../connection-status";

export default function Planner({
  initialPrompt = "",
  conversation,
}: {
  initialPrompt?: string;
  conversation?: Conversation;
}) {
  const { push } = useNavigation();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const transcript = useRef<Transcript | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  function changePrompt(value: string) {
    controller.current?.abort();
    setPrompt(value);
    setQuestion("");
    setAnswer("");
    setError("");
  }
  async function prepare() {
    if (controller.current || (!prompt.trim() && !conversation)) return;
    if (question && !answer.trim()) {
      setError("Answer the clarification question to continue.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Preparing Proposal…",
      message: "Reading meeting context",
    });
    const fullPrompt = `${prompt.trim() || "Propose a follow-up based on the next steps agreed in the selected meeting."}${question ? `\nClarification: ${question}\nMy answer: ${answer}` : ""}`;
    try {
      const [history, selectedTranscript] = await Promise.all([
        readHistory(),
        conversation
          ? (transcript.current ?? loadTranscript(conversation, request.signal))
          : undefined,
      ]);
      transcript.current = selectedTranscript;
      request.signal.throwIfAborted();
      toast.message = "Raycast AI is reviewing your history and next steps";
      const { timeZone } = getPreferenceValues<{ timeZone: string }>();
      const context: PlanningContext = {
        history,
        transcript: selectedTranscript,
        timeZone,
        now: new Date().toISOString(),
        prompt: fullPrompt,
      };
      const { result } = await propose(context, request.signal);
      request.signal.throwIfAborted();
      await toast.hide();
      setPrompt(fullPrompt);
      setAnswer("");
      if (result.status === "clarify") setQuestion(result.question);
      else {
        setQuestion("");
        push(<ProposalReview event={result.event} context={context} />);
      }
    } catch (e) {
      if (!request.signal.aborted) {
        setError(message(e));
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Prepare Proposal";
        toast.message = message(e);
      } else await toast.hide();
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <Form
      navigationTitle={conversation ? "Plan Follow-Up" : undefined}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action
            title={question ? "Update Proposal" : "Prepare Proposal"}
            icon={Icon.Stars}
            onAction={prepare}
          />
          {busy && (
            <Action
              title="Cancel Generation"
              icon={Icon.XMarkCircle}
              onAction={() => controller.current?.abort()}
            />
          )}
          <Action.Push
            title="Check Connections"
            icon={Icon.Gear}
            target={<Connections />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
          />
        </ActionPanel>
      }
    >
      {conversation && (
        <Form.Description title="Fireflies Meeting" text={conversation.title} />
      )}
      <Form.TextArea
        id="prompt"
        title="Meeting Request"
        value={prompt}
        onChange={changePrompt}
        placeholder={
          conversation
            ? "Propose a follow-up, or add your preferences…"
            : "Project sync tomorrow at 5 PM Warsaw time with Alex\nDesign review as usual on Tuesday at 4 PM"
        }
        error={error || undefined}
      />
      {question && <Form.Description title="Clarification" text={question} />}
      {question && (
        <Form.TextField
          id="answer"
          title="Your Answer"
          placeholder="Add the missing details…"
          value={answer}
          onChange={setAnswer}
          autoFocus
        />
      )}
      <Form.Description text="Raycast AI uses matching Mac Calendar events and the selected Fireflies meeting. Review the proposal, then edit and confirm the guests, title, and time in Google Calendar’s Raycast form." />
    </Form>
  );
}
