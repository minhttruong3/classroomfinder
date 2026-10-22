// Run from the repo root:  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { availClass, freeTimes, mergeIntervals, type Meeting } from "../lib/availability.ts";

const meeting = (
  facility_id: string,
  days: string,
  start_time: number,
  end_time: number
): Meeting => ({ facility_id, days, start_time, end_time });

const roomsAt = (list: Meeting[], t: number, day: Parameters<typeof availClass>[2], b = "all") =>
  Object.fromEntries(availClass(list, t, day, b).map((r) => [r.room, r.label]));

test("mergeIntervals: empty, unsorted, touching, contained", () => {
  assert.deepEqual(mergeIntervals([]), []);
  assert.deepEqual(mergeIntervals([[5, 6], [1, 2]]), [[1, 2], [5, 6]]);
  assert.deepEqual(mergeIntervals([[1, 2], [2, 3]]), [[1, 3]]);
  assert.deepEqual(mergeIntervals([[1, 10], [2, 3]]), [[1, 10]]);
});

test("mergeIntervals does not mutate its input", () => {
  const input: [number, number][] = [[5, 6], [1, 2]];
  mergeIntervals(input);
  assert.deepEqual(input, [[5, 6], [1, 2]]);
});

test("freeTimes: whole day when empty, gaps around meetings, nothing after 10PM", () => {
  assert.deepEqual(freeTimes([]), [[0, 22]]);
  assert.deepEqual(freeTimes([[10, 11]]), [[0, 10], [11, 22]]);
  assert.deepEqual(freeTimes([[0, 4], [10, 22]]), [[4, 10]]);
  assert.deepEqual(freeTimes([[9, 10], [10, 11]]), [[0, 9], [11, 22]]);
});

const list = [
  meeting("HAR 101", "Mo", 10, 11),
  meeting("HAR 101", "MoWe", 14, 15.5),
  meeting("SCI 200", "Tu", 9, 10),
];

test("room is busy during its class and free outside it", () => {
  assert.equal(roomsAt(list, 10.5, "Mo")["HAR 101"], undefined);
  assert.equal(roomsAt(list, 9, "Mo")["HAR 101"], "Free for 1 hours 0 minutes");
  assert.equal(roomsAt(list, 11.5, "Mo")["HAR 101"], "Free for 2 hours 30 minutes");
});

test("multi-day meetings (MoWe) block both days and no others", () => {
  assert.equal(roomsAt(list, 14.5, "Mo")["HAR 101"], undefined);
  assert.equal(roomsAt(list, 14.5, "We")["HAR 101"], undefined);
  assert.notEqual(roomsAt(list, 14.5, "Tu")["HAR 101"], undefined);
});

test("a room with no meetings on the selected day is free until 10PM", () => {
  assert.equal(roomsAt(list, 12, "Fr")["SCI 200"], "Free for 10 hours 0 minutes");
});

test("nothing is available at or after 10PM", () => {
  assert.deepEqual(roomsAt(list, 22, "Fr"), {});
  assert.deepEqual(roomsAt(list, 23.5, "Fr"), {});
});

test("building filter matches by room-prefix substring", () => {
  assert.deepEqual(Object.keys(roomsAt(list, 12, "Fr", "HAR")), ["HAR 101"]);
  assert.deepEqual(Object.keys(roomsAt(list, 12, "Fr", "SCI")), ["SCI 200"]);
  assert.deepEqual(roomsAt(list, 12, "Fr", "ZZZ"), {});
  assert.equal(Object.keys(roomsAt(list, 12, "Fr", "all")).length, 2);
});

test("each room is reported once even with many meetings", () => {
  const r = availClass(list, 12, "Fr", "all").filter((x) => x.room === "HAR 101");
  assert.equal(r.length, 1);
});

test("label minutes are floored, not rounded", () => {
  const l = [meeting("A 1", "Mo", 10.5, 11)];
  // free until 10.5 from t=10.2 -> 0.3h = 18 minutes
  assert.equal(roomsAt(l, 10.2, "Mo")["A 1"], "Free for 0 hours 18 minutes");
});

// Documents the current (original-Streamlit-faithful) boundary rule: free
// slots are open intervals, so a room is NOT listed at the exact minute its
// class ends or starts. Change deliberately if that behaviour is revisited.
test("boundary: exact class end/start minute is not listed as free", () => {
  assert.equal(roomsAt(list, 11, "Mo")["HAR 101"], undefined);
  assert.equal(roomsAt(list, 10, "Mo")["HAR 101"], undefined);
  assert.notEqual(roomsAt(list, 11.01, "Mo")["HAR 101"], undefined);
});
