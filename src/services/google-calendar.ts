import { launchCommand, LaunchType } from "@raycast/api";
import { googleCalendarContext } from "../lib/calendar-handoff";
import type { ProposedMeeting } from "../lib/types";
export async function openGoogleConfirmation(event: ProposedMeeting) {
  await launchCommand({
    extensionName: "google-calendar",
    ownerOrAuthorName: "thomas",
    name: "create-event",
    type: LaunchType.UserInitiated,
    context: googleCalendarContext(event),
  });
}
