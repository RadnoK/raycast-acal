# Releasing Cailendar

The GitHub repository is `RadnoK/raycast-acal`; the Raycast extension identifier is `cailendar`. Keep the identifier stable because Raycast scopes stored settings and OAuth credentials to the extension.

## Build Requirements

Use Node.js 22.22.2 or later, macOS Tahoe on Apple Silicon, and Xcode with a Swift 6.3-compatible toolchain (Xcode 26.6 is tested). The Swift package pins the official Raycast bridge; JavaScript and Swift lockfiles should be committed. Users installing a Store build do not need the compiler.

```sh
npm ci
npm run verify
npm run lint:store
lipo assets/compiled_raycast_swift/swift -verify_arch arm64 x86_64
codesign --verify --strict --all-architectures assets/compiled_raycast_swift/swift
```

Do not commit `dist/`, `assets/compiled_raycast_swift/`, `.raycast-swift-build/`, `raycast-env.d.ts`, OAuth callback links, or private meeting data.

## Native Helper

`swift/Sources/CalendarReader.swift` contains the read-only EventKit integration. Raycast builds it from source as part of the TypeScript `swift:` import. The helper has no event save, update, or delete operation. Its embedded Info.plist explains Calendar permission use.

A Store submission must contain the Swift source and package lock, not an opaque precompiled executable. The CI checks the generated binary for both Mac architectures. This is a native-build check, not a claim of Raycast 1 or Intel compatibility: the supported extension runtime is Raycast 2 on macOS Tahoe and Apple Silicon.

## Manual Release Checks

Use the optimized build in Raycast, not only the development bundle:

```sh
npx ray build -e dist
```

This refreshes the installed local extension. Finish or cancel any OAuth flow before rebuilding.

- Open **Cailendar Connections** and verify Calendar permission and Raycast AI access.
- Open **Browse Fireflies Meetings**, finish OAuth in one browser profile, and verify that real meetings load. Reopen the command and confirm no second sign-in is needed.
- Search for a meeting, inspect its summary, and generate a follow-up from the selected transcript.
- Generate a proposal from a direct prompt and confirm that cited history and guests are accurate.
- Exercise a clarification question and then change the request before submitting it again.
- Open **Edit and Confirm** and inspect every populated field in Google Calendar's Raycast form. Do not submit real invitations as part of automated validation.
- Before calling the release fully verified, the maintainer should perform an explicitly authorized event-creation test in a suitable calendar. Unit tests and source contract validation cannot prove Google accepts the final write.

## Store Submission

The `author` in `package.json` must be the real **Raycast account username**. A matching GitHub username alone is insufficient. Resolve every error from `npm run lint:store`.

Add up to six native screenshots under `metadata/`; Raycast recommends at least three, at 2000 × 1250 pixels. Use Raycast's Window Capture command and synthetic meeting details. Never include real attendee addresses, transcript text, OAuth URLs, or private calendar titles.

The changelog uses `## [Release Title] - {PR_MERGE_DATE}` so Raycast inserts the publication date after review. Update the release notes for meaningful user-facing changes.

Only when ready to submit for public review:

```sh
npm run publish
```

This opens or updates a pull request in `raycast/extensions`; it does not immediately publish the extension. Raycast publishes after accepting and merging that pull request. Preparing or pushing this GitHub repository does not submit to the Store.

References: [Store preparation](https://developers.raycast.com/basics/prepare-an-extension-for-store), [publishing](https://developers.raycast.com/basics/publish-an-extension), [Swift bridge](https://github.com/raycast/extensions-swift-tools).

## Validation Record

Release candidate checked on September 9, 2026:

- `npm run verify`: distribution build, ESLint/Prettier, TypeScript, and all 25 tests passed.
- The local checkout was renamed to `raycast-acal`; `npx ray build -e dist` then successfully rebuilt and refreshed the installed extension. Installed metadata reports version `1.0.0` and author `alfaro_konrad`, with source maps referring to the new folder and both native slices passing strict signature checks.
- `npm run lint:store`: author `alfaro_konrad`, manifest, icon, ESLint, and formatting passed.
- Native helper: both `arm64` and `x86_64` slices build and pass strict code-signature verification. Both report Calendar permission status successfully; invalid history ranges return the intended error.
- Native helper: calendar usage descriptions and stable signing identifier verified. Status is ungranted when launched outside Raycast, matching the previous helper. This does not prove the new helper can read authorized history when launched by Raycast.
- Before the native-build migration, the running extension successfully generated a proposal from real calendar history and displayed real Fireflies meetings. Reopening Fireflies did not require another sign-in.
- The current Google Calendar command source still accepts the handoff fields and requires a final form submission. No event was created and no invitations were sent during validation.

Before public submission, verify authorized Calendar history and the complete proposal/confirmation flow in Raycast with this candidate. The native UI automation connection failed during release preparation (`Sky Computer Use native pipe startup failed`), so a fresh UI check and Store screenshots could not be completed. Screenshots should use synthetic data; none of the user's private meetings were added to the repository.

[GitHub Actions run 34330103364](https://github.com/RadnoK/raycast-acal/actions/runs/34330103364) passed on a clean macOS 26 runner for source commit `44c30f5`. Dependency installation, distribution build, lint, TypeScript, all 25 tests, Store metadata, and both native signatures succeeded. The run includes the `cailendar-distribution` artifact (retained for 14 days).

Preparing this repository does not publish to the Raycast Store.
