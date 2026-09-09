export const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The operation could not be completed.";
export const md = (value: string) =>
  value.replace(/[\\`*_{}[\]()#+.!|<>~-]/g, "\\$&");
export function displayDate(iso: string, timeZone = "Europe/Warsaw") {
  return iso
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(new Date(iso))
    : "Unknown date";
}
