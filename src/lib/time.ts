const formatters = new Map<string, Intl.DateTimeFormat>();
export function dateFormatter(timeZone: string) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, value);
  }
  return value;
}
export function localParts(instant: Date, timeZone: string) {
  const p = Object.fromEntries(
    dateFormatter(timeZone)
      .formatToParts(instant)
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
export function localToInstant(date: string, time: string, timeZone: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  )
    throw new Error("Enter a valid date and time.");
  const naive = new Date(`${date}T${time}:00Z`);
  if (
    !Number.isFinite(naive.getTime()) ||
    naive.toISOString().slice(0, 10) !== date
  )
    throw new Error("This date does not exist.");
  dateFormatter(timeZone);
  const matches: Date[] = [];
  for (let offset = -840; offset <= 840; offset += 15) {
    const d = new Date(naive.getTime() - offset * 60_000);
    const p = localParts(d, timeZone);
    if (p.date === date && p.time === time) matches.push(d);
  }
  if (matches.length === 0)
    throw new Error(
      "This time does not exist in the selected time zone due to daylight saving time.",
    );
  if (matches.length > 1)
    throw new Error(
      "This time occurs twice due to daylight saving time. Choose an unambiguous time.",
    );
  return matches[0];
}
