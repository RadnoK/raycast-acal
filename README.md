# Acal

Plan meetings in Raycast from a natural-language request or a Fireflies conversation. Acal uses your synced Mac Calendar history and Raycast AI to suggest the title, guests, time, and agenda, then opens an editable Google Calendar form for your confirmation.

No API keys are required. Fireflies uses browser sign-in, and AI runs through your Raycast AI access. Polish and English requests are supported.

## Requirements

- macOS Tahoe (26) or later on Apple Silicon, as required by [Raycast 2](https://www.raycast.com/new).
- Raycast 2 with access to [Raycast AI](https://www.raycast.com/pro) for meeting proposals. Browsing Fireflies does not require AI access.
- Your Google calendars added to the **Calendar** app on your Mac, with event history available locally.
- The [Google Calendar extension by thomas](https://www.raycast.com/thomas/google-calendar), signed in to the Google account where you want to create events.
- A Fireflies account with access to its [MCP integration](https://docs.fireflies.ai/getting-started/mcp-configuration), if you want to browse recordings or plan follow-ups.

## Setup

1. Open **Acal Connections** in Raycast.
2. Select **Mac Calendar History → Allow Calendar Access**. macOS calls this permission "Full Access"; Acal's native helper only reads events and does not create, modify, or delete them.
3. Select **Fireflies → Connect Fireflies** and finish browser sign-in. This step is optional when scheduling directly from a request.
4. Open **Create Event** in the Google Calendar extension and complete its Google sign-in.
5. Run **Schedule Meeting** or **Browse Fireflies Meetings**.

## Commands

- **Schedule Meeting** — describe a meeting (`Project sync tomorrow at 5 PM Warsaw time with Alex`) and review the proposal before confirming.
- **Browse Fireflies Meetings** — search your recordings and plan a follow-up from a selected transcript.
- **Acal Connections** — connect Fireflies and check Calendar and Raycast AI access.

Command details, settings, limits, and troubleshooting are in [docs/USAGE.md](docs/USAGE.md).

## Privacy

Calendar history is read locally through Apple's EventKit and is never sent to Fireflies. When you generate a proposal, Raycast AI receives your request, matching past events, and only the transcript of the meeting you selected. Fireflies tokens are stored with Raycast's OAuth API; there is no credential server operated by this project. Acal contains no analytics or tracking and does not log tokens, transcripts, or calendar contents.

**Only submitting the final Google Calendar form creates an event.** Full details are in [docs/PRIVACY.md](docs/PRIVACY.md).

## Development

Store users do not need Node.js or Xcode. Building from source requires Node.js 22.22.2 or later and Xcode with a Swift 6.3-compatible toolchain.

```sh
git clone git@github.com:RadnoK/raycast-acal.git
cd raycast-acal
npm ci
npm run dev
```

```sh
npm run verify      # Distribution build, lint, types, and tests
npm run lint:store  # Raycast manifest, author, icon, and source checks
```

The first build compiles the calendar helper using [Raycast's official Swift tools](https://github.com/raycast/extensions-swift-tools). Generated binaries and build caches are not committed. Release checks and the Store submission procedure are in [docs/RELEASING.md](docs/RELEASING.md).

## License

[MIT](LICENSE). This is an independent extension, not an official Fireflies or Google product.
