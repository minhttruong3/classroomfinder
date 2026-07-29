import type { Day } from "@/lib/availability";

const DAY_ABBR: Record<string, Day> = {
  Monday: "Mo",
  Tuesday: "Tu",
  Wednesday: "We",
  Thursday: "Th",
  Friday: "Fr",
  Saturday: "Sa",
  Sunday: "Su",
};

export interface EstNow {
  dayName: string;
  dayAbbr: Day;
  displayTime: string;
  decimalTime: number;
}

// Always derives "now" from the America/New_York timezone, regardless of
// server or visitor location, matching the original app's zoneinfo behavior.
export function getEstNow(): EstNow {
  const now = new Date();

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(now);

  const displayTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  return {
    dayName,
    dayAbbr: DAY_ABBR[dayName],
    displayTime,
    decimalTime: hour + minute / 60,
  };
}
