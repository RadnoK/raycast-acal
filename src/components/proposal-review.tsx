import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useState } from "react";
import type { PlanningContext, ProposedMeeting } from "../lib/types";
import { displayDate, md, message } from "../lib/display";
import { localToInstant } from "../lib/time";
import { overlap } from "../lib/history";
import { openGoogleConfirmation } from "../services/google-calendar";
import { GOOGLE_CALENDAR_STORE } from "../lib/calendar-handoff";

export default function ProposalReview({
  event,
  context,
}: {
  event: ProposedMeeting;
  context: PlanningContext;
}) {
  const { pop } = useNavigation();
  const [opening, setOpening] = useState(false);
  const start = localToInstant(event.date, event.time, event.timeZone);
  const conflicts = overlap(
    context.history.events,
    start,
    event.durationMinutes,
  );
  const sources = context.history.events.filter((e) =>
    event.historyIds.includes(e.id),
  );
  const inWindow =
    start.getTime() + event.durationMinutes * 60_000 <=
    Date.parse(context.now) + 14 * 86400_000;
  const availability =
    !inWindow || context.history.truncated
      ? "Availability could not be fully checked for this date."
      : conflicts.length
        ? `Overlapping events in your calendars: ${conflicts.map((e) => md(e.title)).join(", ")}.`
        : "No overlapping timed events in the calendars that were read.";
  const markdown = `# ${md(event.title)}\n\n**${md(displayDate(start.toISOString(), event.timeZone))}** · ${event.durationMinutes} min · ${md(event.timeZone)}\n\n**Guests:** ${event.attendees.length ? event.attendees.map((a) => (a.name && a.name.toLowerCase() !== a.email.toLowerCase() ? `${md(a.name)} (${md(a.email)})` : md(a.email))).join(", ") : "No guests"}\n\n**Location:** ${event.googleMeet ? "New Google Meet" : md(event.location) || "Not specified"}\n\n${md(event.description)}\n\n---\n\n### Why This Proposal\n\n${md(event.reasoning)}\n\n${event.assumptions.map((a) => `- ${md(a)}`).join("\n")}\n\n${sources.length ? `**History:**\n\n${sources.map((e) => `- ${md(e.title)} · ${md(displayDate(e.start, event.timeZone))}`).join("\n")}` : "No historical events were used."}\n\n${context.transcript ? `**Meeting:** ${md(context.transcript.title)} · ${md(displayDate(context.transcript.date, event.timeZone))}${context.transcript.truncated ? "\n\nLong transcript: the beginning, end, and summary were used." : ""}` : ""}\n\n${availability} Guest availability has not been checked.\n\n${event.calendarHint ? `Suggested calendar: **${md(event.calendarHint)}**. ` : ""}Choose the destination calendar in the next form (defaults to your primary calendar).${event.location ? " The location will be included in the description." : ""}\n\n**Edit and Confirm** opens the Google Calendar form in Raycast. Submitting that form creates the event and sends the invitations you select.`;
  async function confirm() {
    if (opening) return;
    if (start.getTime() <= Date.now()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Meeting Time Has Passed",
        message: "Go back and choose a new date or time.",
      });
      return;
    }
    setOpening(true);
    try {
      await openGoogleConfirmation(event);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Open Calendar Form",
        message: `${message(error)} Install Google Calendar from the action menu.`,
      });
    } finally {
      setOpening(false);
    }
  }
  return (
    <Detail
      navigationTitle="Meeting Proposal"
      isLoading={opening}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Edit and Confirm"
            icon={Icon.Calendar}
            onAction={confirm}
          />
          <Action
            title="Refine Request"
            icon={Icon.Pencil}
            onAction={pop}
            shortcut={Keyboard.Shortcut.Common.Edit}
          />
          <Action.OpenInBrowser
            title="Get Google Calendar Extension"
            url={GOOGLE_CALENDAR_STORE}
          />
        </ActionPanel>
      }
    />
  );
}
