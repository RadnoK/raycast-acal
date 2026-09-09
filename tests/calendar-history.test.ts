import { test } from "node:test";
import assert from "node:assert/strict";
import mockRequire from "mock-require";

function historyHarness(
  selection: string | undefined,
  historyDays = "90",
  readHistory: (days: number, calendarIds: string[]) => unknown = () => {
    throw new Error("Invalid preferences reached the calendar reader");
  },
) {
  // The Raycast storage and generated Swift module require the native app.
  // Reject at the process boundary if invalid preferences reach EventKit.
  const stored = new Map<string, string>([
    ["unrelated-preference", "preserve"],
  ]);
  if (selection !== undefined) stored.set("history-calendars-v1", selection);
  mockRequire("@raycast/api", {
    LocalStorage: {
      getItem: async (key: string) => stored.get(key),
      removeItem: async (key: string) => stored.delete(key),
    },
    getPreferenceValues: () => ({ historyDays }),
  });
  mockRequire("swift:../../swift", {
    nativeReadHistory: readHistory,
  });
  const service = mockRequire.reRequire(
    "../src/services/calendar-history.ts",
  ) as {
    readHistory(): Promise<unknown>;
  };
  return { readHistory: service.readHistory, stored };
}

test("invalid saved calendar selections are reset without reading broader calendar history", async () => {
  for (const selection of [
    "",
    "invalid JSON",
    "null",
    '"calendar-id"',
    "[42]",
    '[""]',
  ]) {
    const service = historyHarness(selection);
    try {
      await assert.rejects(
        service.readHistory(),
        /selection.*reset.*try again/i,
      );
      assert.equal(service.stored.get("history-calendars-v1"), undefined);
      assert.equal(service.stored.get("unrelated-preference"), "preserve");
    } finally {
      mockRequire.stopAll();
    }
  }
});

test("a missing selection reads all calendars for the configured history range", async () => {
  const service = historyHarness(undefined, "90", (days, calendarIds) => {
    assert.equal(days, 90);
    assert.deepEqual(calendarIds, []);
    return { calendars: [], events: [], truncated: false };
  });
  try {
    assert.deepEqual(await service.readHistory(), {
      calendars: [],
      events: [],
      truncated: false,
    });
  } finally {
    mockRequire.stopAll();
  }
});

test("a saved selection limits native history to those calendars", async () => {
  const service = historyHarness(
    '["work", "personal"]',
    "180",
    (days, calendarIds) => {
      assert.equal(days, 180);
      assert.deepEqual(calendarIds, ["work", "personal"]);
      return { calendars: [], events: [], truncated: true };
    },
  );
  try {
    assert.deepEqual(await service.readHistory(), {
      calendars: [],
      events: [],
      truncated: true,
    });
  } finally {
    mockRequire.stopAll();
  }
});

test("unsupported history ranges fail before starting the calendar reader", async () => {
  for (const historyDays of ["", "NaN", "7", "181"]) {
    const service = historyHarness(undefined, historyDays);
    try {
      await assert.rejects(service.readHistory(), /history range/i);
    } finally {
      mockRequire.stopAll();
    }
  }
});
