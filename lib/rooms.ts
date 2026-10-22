// Structured per-room availability for the redesigned UI.
//
// This composes the existing freeTimes() from availability.ts rather than
// changing it: a room is "free" at time t exactly when t falls strictly inside
// one of its free slots, the same rule availClass() uses (see
// tests/rooms.test.ts, which checks the two agree during opening hours).
import { freeTimes, type Day, type Interval, type Meeting } from "./availability.ts";

// freeTimes() ends the day at this hour; a slot ending here means "no more
// classes today".
export const DAY_END = freeTimes([])[0][1];

// Buildings are only open between these hours. freeTimes() treats the whole
// 0:00-22:00 span as available, so without this a 2 AM search would report
// every room as "free for the rest of the day". Adjust if hours differ.
export const OPEN_HOUR = 7;

export function isCampusOpen(t: number): boolean {
  return t >= OPEN_HOUR && t < DAY_END;
}

export const DAYS: { abbr: Day; name: string }[] = [
  { abbr: "Mo", name: "Monday" },
  { abbr: "Tu", name: "Tuesday" },
  { abbr: "We", name: "Wednesday" },
  { abbr: "Th", name: "Thursday" },
  { abbr: "Fr", name: "Friday" },
  { abbr: "Sa", name: "Saturday" },
  { abbr: "Su", name: "Sunday" },
];

// Gaps shorter than this are walking time between back-to-back classes, not
// somewhere you can sit, so they are left out of the "opening later" lists.
export const MIN_OPENING_MINS = 30;

export interface FreeRoom {
  room: string;
  building: string;
  freeUntil: number;
  minsLeft: number;
  restOfDay: boolean;
}

export interface OpeningRoom {
  room: string;
  building: string;
  opensAt: number;
  freeMins: number;
  restOfDay: boolean;
}

export type Named<T> = T & { buildingName: string };

export interface RoomFeed {
  day: string;
  checked: string;
  at: number;
  free: Named<FreeRoom>[];
  opening: Named<OpeningRoom>[];
}

export function buildingOf(facilityId: string): string {
  return facilityId.split(/[ _]/)[0];
}

function freeSlotsByRoom(list: Meeting[], day: Day): Map<string, Interval[]> {
  const busy = new Map<string, Interval[]>();
  for (const m of list) {
    if (!busy.has(m.facility_id)) busy.set(m.facility_id, []);
    const days: string[] = m.days.match(/.{2}/g) ?? [];
    if (days.includes(day)) busy.get(m.facility_id)!.push([m.start_time, m.end_time]);
  }
  const slots = new Map<string, Interval[]>();
  for (const [room, intervals] of busy) slots.set(room, freeTimes(intervals));
  return slots;
}

const byRoom = (a: { room: string }, b: { room: string }) =>
  a.room.localeCompare(b.room, undefined, { numeric: true });

/** Rooms free at time t (decimal hours) on the given day, longest free first. */
export function freeRoomsAt(list: Meeting[], t: number, day: Day): FreeRoom[] {
  if (!isCampusOpen(t)) return [];
  const rooms: FreeRoom[] = [];
  for (const [room, slots] of freeSlotsByRoom(list, day)) {
    const slot = slots.find(([start, end]) => start < t && t < end);
    if (!slot) continue;
    rooms.push({
      room,
      building: buildingOf(room),
      freeUntil: slot[1],
      minsLeft: Math.round((slot[1] - t) * 60),
      restOfDay: slot[1] === DAY_END,
    });
  }
  return rooms.sort((a, b) => b.freeUntil - a.freeUntil || byRoom(a, b));
}

/**
 * Rooms that are busy at time t but have a usable gap later the same day,
 * soonest opening first. Before opening hours every gap is clipped to start no
 * earlier than OPEN_HOUR, so a 2 AM search lists what opens at 7:00 AM.
 */
export function openingRoomsAfter(list: Meeting[], t: number, day: Day): OpeningRoom[] {
  if (t >= DAY_END) return [];
  const from = Math.max(t, OPEN_HOUR);
  const rooms: OpeningRoom[] = [];
  for (const [room, slots] of freeSlotsByRoom(list, day)) {
    if (isCampusOpen(t) && slots.some(([start, end]) => start < t && t < end)) continue;
    const next = slots
      .map(([start, end]): Interval => [Math.max(start, from), end])
      .find(([start, end]) => Math.round((end - start) * 60) >= MIN_OPENING_MINS);
    if (!next) continue;
    rooms.push({
      room,
      building: buildingOf(room),
      opensAt: next[0],
      freeMins: Math.round((next[1] - next[0]) * 60),
      restOfDay: next[1] === DAY_END,
    });
  }
  return rooms.sort((a, b) => a.opensAt - b.opensAt || byRoom(a, b));
}
