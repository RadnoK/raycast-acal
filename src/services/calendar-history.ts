import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  nativeAuthorizeCalendar,
  nativeCalendarStatus,
  nativeReadHistory,
} from "swift:../../swift";
import type { CalendarHistory } from "../lib/types";

export const HISTORY_CALENDARS_KEY = "history-calendars-v1";

type CalendarStatus = { authorized: boolean; status: number };

export function calendarStatus(): Promise<CalendarStatus> {
  return nativeCalendarStatus();
}

export function authorizeCalendar(): Promise<CalendarStatus> {
  return nativeAuthorizeCalendar();
}

export async function readHistory(): Promise<CalendarHistory> {
  const ids = await LocalStorage.getItem<string>(HISTORY_CALENDARS_KEY);
  const { historyDays } = getPreferenceValues<{ historyDays: string }>();
  const days = Number(historyDays);
  if (![30, 90, 180].includes(days)) {
    throw new Error(
      "Invalid calendar history range. Choose 30, 90, or 180 days.",
    );
  }

  let calendarIds: unknown;
  try {
    calendarIds = ids === undefined ? [] : JSON.parse(ids);
  } catch {
    calendarIds = undefined;
  }
  if (
    !Array.isArray(calendarIds) ||
    !calendarIds.every(
      (id): id is string => typeof id === "string" && id.length > 0,
    )
  ) {
    await LocalStorage.removeItem(HISTORY_CALENDARS_KEY);
    throw new Error(
      "Saved calendar selection was invalid and has been reset. Try again.",
    );
  }
  return nativeReadHistory(days, calendarIds);
}
