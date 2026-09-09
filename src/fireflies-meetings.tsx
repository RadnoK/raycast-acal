import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { withAccessToken } from "@raycast/utils";
import Connections from "./connection-status";
import Planner from "./components/planner";
import {
  connectFireflies,
  firefliesConnected,
} from "./services/fireflies-auth";
import { listConversations } from "./services/fireflies";
import type { Conversation } from "./lib/types";
import { displayDate, md, message } from "./lib/display";

function ConversationDetail({ conversation }: { conversation: Conversation }) {
  const markdown = `# ${md(conversation.title)}\n\n${md(displayDate(conversation.date))} · ${Math.round(conversation.durationMinutes)} min\n\n${conversation.participants.map((p) => md(p.name || p.email)).join(", ")}\n\n${md(conversation.summary) || "No summary in this list. The transcript will be loaded when you prepare a proposal."}`;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.Push
            title="Plan Follow-Up"
            icon={Icon.Stars}
            target={<Planner conversation={conversation} />}
          />
          <Action.OpenInBrowser
            title="Open Meeting in Fireflies"
            url={conversation.url}
          />
        </ActionPanel>
      }
    />
  );
}

function Command() {
  const [search, setSearch] = useState("");
  const [meetings, setMeetings] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const offset = useRef(0);
  const pending = useRef<AbortController | null>(null);

  async function load(append = false) {
    if (append && pending.current) return;
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    setError("");
    try {
      const loggedIn = await firefliesConnected();
      if (request.signal.aborted) return;
      setConnected(loggedIn);
      if (!loggedIn) {
        setMeetings([]);
        setHasMore(false);
        return;
      }
      const skip = append ? offset.current : 0;
      const data = await listConversations(search, skip, request.signal);
      if (request.signal.aborted) return;
      setMeetings((previous) => [
        ...new Map(
          [...(append ? previous : []), ...data].map((m) => [m.id, m]),
        ).values(),
      ]);
      offset.current = skip + data.length;
      setHasMore(data.length === 25);
    } catch (e) {
      if (!request.signal.aborted) {
        setError(message(e));
        setHasMore(false);
      }
    } finally {
      if (pending.current === request) {
        pending.current = null;
        setLoading(false);
      }
    }
  }
  useEffect(() => {
    setMeetings([]);
    setHasMore(false);
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 350);
    return () => {
      clearTimeout(timer);
      pending.current?.abort();
    };
    // The request is restarted only by a new search or explicit refresh.
  }, [search, revision]);
  const connectionActions = (
    <ActionPanel>
      <Action.Push
        title="Connect Fireflies"
        icon={Icon.Plug}
        target={<Connections />}
        onPop={() => setRevision((n) => n + 1)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={() => setRevision((n) => n + 1)}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel>
  );
  return (
    <List
      isLoading={loading}
      filtering={false}
      searchBarPlaceholder="Search meetings by title…"
      onSearchTextChange={setSearch}
      searchText={search}
      pagination={{
        hasMore,
        pageSize: 25,
        onLoadMore: () => {
          void load(true);
        },
      }}
    >
      {!loading && (
        <List.EmptyView
          title={
            error
              ? "Could Not Load Meetings"
              : connected
                ? "No Meetings Found"
                : "Connect Your Fireflies Account"
          }
          description={
            error ||
            (connected
              ? "Try another search or refresh the list."
              : "Sign in with your Fireflies account. No API key is needed.")
          }
          icon={Icon.SpeechBubble}
          actions={connectionActions}
        />
      )}
      {meetings.map((conversation) => (
        <List.Item
          key={conversation.id}
          title={conversation.title}
          subtitle={conversation.participants
            .map((p) => p.name || p.email)
            .slice(0, 3)
            .join(", ")}
          icon={Icon.SpeechBubble}
          accessories={
            conversation.date ? [{ date: new Date(conversation.date) }] : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Meeting"
                target={<ConversationDetail conversation={conversation} />}
                icon={Icon.Document}
              />
              <Action.Push
                title="Plan Follow-Up"
                target={<Planner conversation={conversation} />}
                icon={Icon.Stars}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
              />
              <Action.OpenInBrowser
                title="Open in Fireflies"
                url={conversation.url}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() => setRevision((n) => n + 1)}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
              <Action.Push
                title="Connections"
                icon={Icon.Gear}
                target={<Connections />}
                onPop={() => setRevision((n) => n + 1)}
              />
            </ActionPanel>
          }
        />
      ))}
      {error && meetings.length > 0 && (
        <List.Item
          title="Could Not Load More Meetings"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => load(true)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

// Keep the command suspended during OAuth. Starting OAuth from an action in
// an already rendered view can unload its callback worker in Raycast 2.
export default withAccessToken({ authorize: connectFireflies })(Command);
