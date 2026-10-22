// Run from the repo root:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { availClass, type Day, type Meeting } from "../lib/availability.ts";
import {
  DAYS,
  DAY_END,
  MIN_OPENING_MINS,
  OPEN_HOUR,
  freeRoomsAt,
  isCampusOpen,
  openingRoomsAfter,
} from "../lib/rooms.ts";
import { formatClock, formatMins } from "../lib/format.ts";

const GROUPS = "CDS QST CGS COM ENG CAS MET GRS CFA SAR SDM SHA LAW MED SPH SSW STH WED".split(" ");
const real: Meeting[] = GROUPS.flatMap((g) =>
  JSON.parse(readFileSync(new URL(`../${g}.json`, import.meta.url), "utf8"))
);

const meeting = (facility_id: string, days: string, start_time: number, end_time: number): Meeting => ({
  facility_id,
  days,
  start_time,
  end_time,
});

const list: Meeting[] = [
  meeting("CAS 211", "Mo", 10, 11),
  meeting("CAS 211", "Mo", 13, 14),
  meeting("CAS 324", "Mo", 9, 12.5),
  meeting("KCB 104", "Mo", 11, 22), // busy until close
  meeting("HAR 302", "Mo", 12.5, 12.75), // 15-minute window between classes
  meeting("HAR 302", "Mo", 13, 14),
  meeting("ERB B08", "Tu", 9, 10), // nothing on Monday
];

test("DAY_END matches the 10 PM bound used by freeTimes", () => {
  assert.equal(DAY_END, 22);
});

test("free rooms: until/minsLeft and rest-of-day flag", () => {
  const rooms = freeRoomsAt(list, 11.5, "Mo");
  const by = Object.fromEntries(rooms.map((r) => [r.room, r]));
  assert.equal(by["CAS 211"].freeUntil, 13);
  assert.equal(by["CAS 211"].minsLeft, 90);
  assert.equal(by["CAS 211"].restOfDay, false);
  assert.equal(by["ERB B08"].restOfDay, true);
  assert.equal(by["ERB B08"].minsLeft, Math.round((22 - 11.5) * 60));
  assert.equal(by["CAS 324"], undefined); // in class until 12:30
  assert.equal(by["KCB 104"], undefined);
  assert.equal(by["CAS 211"].building, "CAS");
});

test("free rooms are sorted longest-free first, ties by room code", () => {
  const rooms = freeRoomsAt(list, 11.5, "Mo");
  for (let i = 1; i < rooms.length; i++) {
    assert.ok(rooms[i - 1].freeUntil >= rooms[i].freeUntil);
  }
  assert.equal(rooms[0].room, "ERB B08"); // free the rest of the day
});

test("opening rooms: busy now, usable gap later, soonest first", () => {
  const rooms = openingRoomsAfter(list, 11.5, "Mo");
  const by = Object.fromEntries(rooms.map((r) => [r.room, r]));
  assert.equal(by["CAS 324"].opensAt, 12.5);
  assert.equal(by["CAS 324"].freeMins, Math.round((22 - 12.5) * 60)); // free from 12:30 to close
  assert.equal(by["CAS 324"].restOfDay, true);
  assert.equal(by["CAS 211"], undefined); // free now, so not "opening"
  assert.equal(by["KCB 104"], undefined); // no gap before close
  for (let i = 1; i < rooms.length; i++) {
    assert.ok(rooms[i - 1].opensAt <= rooms[i].opensAt);
  }
});

test("opening rooms skip short gaps but still find the next usable one", () => {
  // 12:36 is inside HAR 302's 12:30-12:45 class. Its next gap (12:45-1:00) is
  // only 15 minutes, so the room should report the 2:00 PM gap instead.
  const har = openingRoomsAfter(list, 12.6, "Mo").find((r) => r.room === "HAR 302");
  assert.equal(har?.opensAt, 14);
  assert.equal(har?.restOfDay, true);
  for (const r of openingRoomsAfter(real, 8, "Mo")) {
    assert.ok(r.freeMins >= MIN_OPENING_MINS, `${r.room} gap ${r.freeMins}m`);
  }
});

test("a room whose class ends exactly now shows as opening (not a dead zone)", () => {
  const rooms = openingRoomsAfter([meeting("A 1", "Mo", 10, 11)], 11, "Mo");
  assert.equal(rooms[0]?.room, "A 1");
  assert.equal(rooms[0]?.opensAt, 11);
  assert.equal(rooms[0]?.restOfDay, true);
});

// Real data: during opening hours the new free-now sets must equal availClass
// for every day/time, so the redesign cannot drift from the existing schedule
// logic. Outside opening hours nothing is free, however empty the schedule is.
test("free rooms equal availClass('all') on the real data during opening hours", () => {
  const days: Day[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const times = [7, 7.5, 8.25, 9, 10.75, 12, 13.5, 15.25, 17, 18.5, 20, 21.75];
  for (const day of days) {
    for (const t of times) {
      const expected = availClass(real, t, day, "all").map((r) => r.room).sort();
      const actual = freeRoomsAt(real, t, day).map((r) => r.room).sort();
      assert.deepEqual(actual, expected, `${day} ${t}`);
      assert.ok(actual.length > 0 || day === "Su" || day === "Sa", `${day} ${t} empty`);
    }
  }
});

test("campus hours: closed before opening and from closing time on", () => {
  assert.equal(OPEN_HOUR, 7);
  assert.equal(isCampusOpen(6.99), false);
  assert.equal(isCampusOpen(7), true);
  assert.equal(isCampusOpen(21.99), true);
  assert.equal(isCampusOpen(DAY_END), false);
});

test("nothing is free at 2 AM or after 10 PM, even though availClass would list rooms", () => {
  for (const day of ["Mo", "Th", "Su"] as Day[]) {
    for (const t of [0, 2, 6.75, 22, 23.5]) {
      assert.deepEqual(freeRoomsAt(real, t, day), [], `${day} ${t}`);
    }
  }
  assert.ok(availClass(real, 2, "Th", "all").length > 100); // the old rule is what we guard against
});

test("before opening, rooms list as opening at 7:00 AM (or when their first class ends)", () => {
  const by = Object.fromEntries(openingRoomsAfter(list, 2, "Mo").map((r) => [r.room, r]));
  assert.equal(by["ERB B08"].opensAt, OPEN_HOUR); // empty Monday
  assert.equal(by["ERB B08"].freeMins, (DAY_END - OPEN_HOUR) * 60);
  assert.equal(by["ERB B08"].restOfDay, true);
  assert.equal(by["CAS 324"].opensAt, OPEN_HOUR); // first class at 9
  assert.equal(by["CAS 324"].freeMins, 120);
  assert.equal(by["CAS 324"].restOfDay, false);
  for (const r of openingRoomsAfter(real, 2, "Th")) {
    assert.ok(r.opensAt >= OPEN_HOUR, `${r.room} opens ${r.opensAt}`);
  }
});

test("a class that runs past 7 AM pushes the opening time to its end", () => {
  const early = [meeting("B 2", "Mo", 6, 9)];
  assert.equal(openingRoomsAfter(early, 2, "Mo")[0]?.opensAt, 9);
});

test("after closing there is nothing left to open", () => {
  assert.deepEqual(openingRoomsAfter(list, 22.5, "Mo"), []);
});

test("minsLeft agrees with availClass's label to within a minute (real data)", () => {
  const t = 10.75;
  const labels = new Map(availClass(real, t, "Tu", "all").map((r) => [r.room, r.label]));
  for (const r of freeRoomsAt(real, t, "Tu")) {
    const m = /Free for (\d+) hours (\d+) minutes/.exec(labels.get(r.room) ?? "");
    assert.ok(m, r.room);
    const labelMins = Number(m[1]) * 60 + Number(m[2]);
    assert.ok(Math.abs(labelMins - r.minsLeft) <= 1, `${r.room}: ${labelMins} vs ${r.minsLeft}`);
  }
});

test("formatClock", () => {
  assert.equal(formatClock(13.75), "1:45 PM");
  assert.equal(formatClock(0), "12:00 AM");
  assert.equal(formatClock(12), "12:00 PM");
  assert.equal(formatClock(14 + 10 / 60), "2:10 PM");
  assert.equal(formatClock(21.9999), "10:00 PM");
});

test("formatMins", () => {
  assert.equal(formatMins(141), "2h 21m");
  assert.equal(formatMins(51), "51m");
  assert.equal(formatMins(120), "2h");
  assert.equal(formatMins(0), "0m");
});

test("DAYS lists Monday to Sunday with the abbreviations the schedule data uses", () => {
  assert.deepEqual(DAYS.map((d) => d.abbr), ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
  assert.deepEqual(DAYS.map((d) => d.name), [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  ]);
  // every abbreviation actually occurs in the real schedule
  const used = new Set(real.flatMap((m) => m.days.match(/.{2}/g) ?? []));
  for (const d of DAYS) assert.ok(used.has(d.abbr), d.abbr);
});

test("different days give different answers on the real data", () => {
  const mon = freeRoomsAt(real, 10.5, "Mo").map((r) => r.room).sort();
  const tue = freeRoomsAt(real, 10.5, "Tu").map((r) => r.room).sort();
  const sun = freeRoomsAt(real, 10.5, "Su").length;
  assert.notDeepEqual(mon, tue);
  assert.ok(sun > mon.length, "far fewer classes on Sunday, so more rooms free");
});
