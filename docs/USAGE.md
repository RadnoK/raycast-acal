# Using Acal

## Schedule Meeting

Enter a request, for example:

- `Project sync tomorrow at 5 PM Warsaw time with Alex`
- `Design review as usual on Tuesday at 4 PM`
- `Project Sync jutro o 17:00 PL z Mike`
- `Team Sync jak zwykle we wtorek o 16:00`

Polish and English requests are supported. "As usual" uses matching past events; missing or ambiguous details lead to a clarification question. Guest email addresses must come from your request, matching history, or the selected Fireflies meeting.

The proposal shows its sources, assumptions, and any overlapping timed events. **Edit and Confirm** opens the Google Calendar extension's form, where you can change the calendar, title, guests, date, time, duration, Google Meet setting, description, and invitations. **Only submitting that final form creates the event.**

## Browse Fireflies Meetings

Browse your meetings, search by title, and open a meeting's summary. Choose **Plan Follow-Up** to read the selected transcript and propose a meeting based on next steps, deadlines, and scheduling agreements. You can add instructions before generating the proposal.

The extension uses Fireflies' official OAuth and MCP endpoints. It automatically reuses and refreshes the saved session. To disconnect, open **Acal Connections → Fireflies → Sign Out of Fireflies**.

## Settings

The default time zone is `Europe/Warsaw` and the history window is 90 days. Change the time zone or choose 30, 90, or 180 days in Raycast's extension settings.

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

**Calendar access is denied:** Enable Calendar access for Raycast/Acal in **System Settings → Privacy & Security → Calendars**, then reopen the command. Confirm that your calendars are syncing in the Mac Calendar app.

**The confirmation form does not open:** Install and sign in to the Google Calendar extension linked above. Acal relies on its `Create Event` command.
