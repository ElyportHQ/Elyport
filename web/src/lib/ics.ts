/** A one-event calendar file as a data URL, used for claim and unlock reminders. */
export function icsHref({ title, ts, url, description }: { title: string; ts: number; url: string; description: string }) {
  const fmt = (t: number) => new Date(t * 1000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (v: string) => v.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Elyport//Reminder//EN",
    "BEGIN:VEVENT",
    `UID:${ts}-${Math.random().toString(36).slice(2)}@elyport.com`,
    `DTSTAMP:${fmt(Date.now() / 1000)}`,
    `DTSTART:${fmt(ts)}`,
    `DTEND:${fmt(ts + 1800)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
