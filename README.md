# Cailendar

Plan meetings in Raycast from a natural-language request or a Fireflies conversation. Cailendar uses your synced Mac Calendar history and Raycast AI to suggest the title, guests, time, and agenda, then opens an editable Google Calendar form for your confirmation.

No API keys are required. Fireflies uses browser sign-in, and AI runs through your Raycast AI access.

## Requirements

- macOS Tahoe (26) or later on Apple Silicon, as required by [Raycast 2](https://www.raycast.com/new).
- Raycast 2 with access to [Raycast AI](https://www.raycast.com/pro) for meeting proposals. Browsing Fireflies does not require AI access.
- Your Google calendars added to the **Calendar** app on your Mac, with event history available locally.
- The [Google Calendar extension by thomas](https://www.raycast.com/thomas/google-calendar), signed in to the Google account where you want to create events.
- A Fireflies account with access to its [MCP integration](https://docs.fireflies.ai/getting-started/mcp-configuration), if you want to browse recordings or plan follow-ups.

## Setup

1. Open **Cailendar Connections** in Raycast.
2. Select **Mac Calendar History → Allow Calendar Access**. macOS calls this permission “Full Access”; Cailendar's native helper only reads events and does not create, modify, or delete them.
3. Select **Fireflies → Connect Fireflies** and finish browser sign-in. This step is optional when scheduling directly from a request.
4. Open **Create Event** in the Google Calendar extension and complete its Google sign-in.
5. Run **Schedule Meeting** or **Browse Fireflies Meetings**.

The default time zone is `Europe/Warsaw` and the history window is 90 days. Change the time zone or choose 30, 90, or 180 days in Raycast's extension settings.

## Schedule Meeting

Enter a request, for example:

- `Project sync tomorrow at 5 PM Warsaw time with Alex`
- `Design review as usual on Tuesday at 4 PM`
- `JEB Sync jutro o 17:00 PL z Mike`
- `Reflex Sync jak zwykle we wtorek o 16:00`

Polish and English requests are supported. “As usual” uses matching past events; missing or ambiguous details lead to a clarification question. Guest email addresses must come from your request, matching history, or the selected Fireflies meeting.

The proposal shows its sources, assumptions, and any overlapping timed events. **Edit and Confirm** opens the Google Calendar extension's form, where you can change the calendar, title, guests, date, time, duration, Google Meet setting, description, and invitations. **Only submitting that final form creates the event.**

## Browse Fireflies Meetings

Browse your meetings, search by title, and open a meeting's summary. Choose **Plan Follow-Up** to read the selected transcript and propose a meeting based on next steps, deadlines, and scheduling agreements. You can add instructions before generating the proposal.

The extension uses Fireflies' official OAuth and MCP endpoints. It automatically reuses and refreshes the saved session. To disconnect, open **Cailendar Connections → Fireflies → Sign Out of Fireflies**.

## Privacy and Data Flow

- **Calendar history:** Event titles, times, attendees, locations, short notes, and calendar names are read locally through Apple's EventKit. Up to 3,000 events are read within the configured history window and 14 days ahead. No calendar data is sent to Fireflies.
- **Raycast AI:** When you generate a proposal, the model receives your request, up to 24 matching past events, and the transcript and summary of the single Fireflies meeting you selected, if any. Future events are used locally to check overlaps. Raycast's [AI privacy terms](https://www.raycast.com/privacy) apply to its processing.
- **Fireflies:** Browsing requests your meeting list from Fireflies. Generating a follow-up fetches the selected meeting's transcript and summary. No recordings are uploaded by this extension.
- **Credentials:** Fireflies tokens are stored with Raycast's OAuth API. Raycast LocalStorage stores the public OAuth client ID and local preferences. There is no separate credential server operated by this project.
- **Google Calendar:** The editable proposal is passed to the companion extension on your Mac. Its final form submission creates the event and can send invitations, according to your choices.
- **Telemetry:** Cailendar contains no analytics or tracking service and does not log tokens, transcripts, or calendar contents.

Calendar and transcript text are treated as untrusted data. AI output is validated, but you should still check the proposed recipients and details before confirming.

## Limits

- One timed, non-recurring event at a time. Requests for a series, multiple events, or an all-day event require clarification.
- Your guests' availability is not checked. Local overlap checks cover timed events in the calendars read from your Mac, up to 14 days ahead. Incomplete history or dates outside that window are disclosed.
- The destination calendar defaults to your primary Google calendar; choose a different calendar in the final form. Local EventKit calendar identifiers cannot be used as Google Calendar identifiers.
- Physical locations are included in the event description because the companion extension's current form does not expose a location field.
- Long transcripts retain their beginning, end, and summary. The proposal identifies when text was shortened.
- Ambiguous or nonexistent local times at daylight saving transitions are rejected instead of silently selecting an offset. `PL time` means `Europe/Warsaw`, including daylight saving time.
- Relative dates inside a transcript refer to the recording date. A request entered now uses the current date.

## Troubleshooting

**Browser reports success, but Raycast still asks you to sign in:** During development, rebuilding the extension invalidates an in-progress OAuth callback. Press **⌘ Esc**, reopen **Browse Fireflies Meetings**, and start a fresh sign-in. Do not reuse an old callback tab.

**Fireflies uses a different Chrome profile:** Select **Copy authorization link** in Raycast and open that original link in the signed-in profile. Complete every step in the same profile. Moving an intermediate login URL between profiles can cause `Session binding verification failed`.

**Calendar access is denied:** Enable Calendar access for Raycast/Cailendar in **System Settings → Privacy & Security → Calendars**, then reopen the command. Confirm that your calendars are syncing in the Mac Calendar app.

**The confirmation form does not open:** Install and sign in to the Google Calendar extension linked above. Cailendar relies on its `Create Event` command.

## Local Installation and Development

Store users do not need Node.js or Xcode. Building from source requires Node.js 22.22.2 or later and Xcode with a Swift 6.3-compatible toolchain.

```sh
git clone git@github.com:RadnoK/raycast-acal.git
cd raycast-acal
npm ci
npm run dev
```

The repository may be private while the release is being prepared. A clone requires access to it. The extension retains the identifier `cailendar` so existing local Fireflies sessions remain available.

The first build compiles the calendar helper using [Raycast's official Swift tools](https://github.com/raycast/extensions-swift-tools). Subsequent builds reuse the Swift build cache. Generated binaries and build caches are not committed.

```sh
npm run verify      # Distribution build, lint, types, and tests
npm run lint:store  # Raycast manifest, author, icon, and source checks
```

The distribution build is written to `dist/`. Maintainer instructions, release checks, and the Store submission procedure are in [docs/RELEASING.md](docs/RELEASING.md).

## License

[MIT](LICENSE). This is an independent extension, not an official Fireflies or Google product.
