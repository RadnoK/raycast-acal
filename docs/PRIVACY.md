# Privacy and Data Flow

Cailendar contains no analytics or tracking service and does not log tokens, transcripts, or calendar contents. There is no credential server operated by this project.

## What is read

**Calendar history:** Event titles, times, attendees, locations, short notes, and calendar names are read locally through Apple's EventKit. Up to 3,000 events are read within the configured history window and 14 days ahead. No calendar data is sent to Fireflies.

**Fireflies:** Browsing requests your meeting list from Fireflies. Generating a follow-up fetches the selected meeting's transcript and summary. No recordings are uploaded by this extension.

## What leaves your Mac

**Raycast AI:** When you generate a proposal, the model receives your request, up to 24 matching past events, and the transcript and summary of the single Fireflies meeting you selected, if any. Future events are used locally to check overlaps. Raycast's [AI privacy terms](https://www.raycast.com/privacy) apply to its processing.

**Google Calendar:** The editable proposal is passed to the companion extension on your Mac. Its final form submission creates the event and can send invitations, according to your choices.

## Credentials

Fireflies tokens are stored with Raycast's OAuth API. Raycast LocalStorage stores the public OAuth client ID and local preferences.

## Untrusted input

Calendar and transcript text are treated as untrusted data. AI output is validated, but you should still check the proposed recipients and details before confirming.
