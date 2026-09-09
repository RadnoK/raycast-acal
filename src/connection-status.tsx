import {
  Action,
  ActionPanel,
  AI,
  Color,
  Icon,
  List,
  environment,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizeCalendar, calendarStatus } from "./services/calendar-history";
import {
  disconnectFireflies,
  firefliesConnected,
} from "./services/fireflies-auth";
import { GOOGLE_CALENDAR_STORE } from "./lib/calendar-handoff";
import { message } from "./lib/display";

export default function Connections() {
  const [calendar, setCalendar] = useState(false);
  const [fireflies, setFireflies] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function refresh() {
    setLoading(true);
    try {
      const [cal, ff] = await Promise.all([
        calendarStatus(),
        firefliesConnected(),
      ]);
      setCalendar(cal.authorized);
      setFireflies(ff);
      setError("");
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function perform(action: () => Promise<unknown>) {
    setLoading(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could Not Connect",
        message: message(e),
      });
    } finally {
      setLoading(false);
    }
  }
  const status = (connected: boolean) => [
    {
      text: connected ? "Connected" : "Not Connected",
      icon: {
        source: connected ? Icon.CheckCircle : Icon.Circle,
        tintColor: connected ? Color.Green : Color.SecondaryText,
      },
    },
  ];
  return (
    <List searchBarPlaceholder="Search connections…" isLoading={loading}>
      {error && (
        <List.Item
          title={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={refresh}
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        title="Raycast AI"
        subtitle="Uses your Raycast AI plan"
        icon={Icon.Stars}
        accessories={status(environment.canAccess(AI))}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Manage Raycast Plan"
              url="https://www.raycast.com/pro"
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Mac Calendar History"
        subtitle="Read synced events and attendees"
        icon={Icon.Calendar}
        accessories={status(calendar)}
        actions={
          <ActionPanel>
            {!calendar && (
              <Action
                title="Allow Calendar Access"
                icon={Icon.Calendar}
                onAction={() =>
                  perform(async () => {
                    const result = await authorizeCalendar();
                    if (!result.authorized)
                      throw new Error(
                        "Enable access for Raycast/Acal in System Settings → Privacy & Security → Calendars.",
                      );
                  })
                }
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
            <Action
              title="Open Extension Settings"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Fireflies"
        subtitle="Meetings, transcripts, and summaries · account sign-in"
        icon={Icon.SpeechBubble}
        accessories={status(fireflies)}
        actions={
          <ActionPanel>
            <Action
              title={fireflies ? "Browse Meetings" : "Connect Fireflies"}
              icon={fireflies ? Icon.SpeechBubble : Icon.Plug}
              onAction={() =>
                perform(() =>
                  launchCommand({
                    name: "fireflies-meetings",
                    type: LaunchType.UserInitiated,
                  }),
                )
              }
            />
            {fireflies && (
              <Action
                title="Sign Out of Fireflies"
                icon={Icon.Logout}
                style={Action.Style.Destructive}
                onAction={() => perform(disconnectFireflies)}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={refresh}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Google Calendar for Raycast"
        subtitle="Review, edit, and create events · Google sign-in"
        icon={Icon.AddPerson}
        accessories={[{ text: "Companion Extension" }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Get Google Calendar Extension"
              url={GOOGLE_CALENDAR_STORE}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
