export interface Meeting {
  facility_id: string;
  days: string;
  start_time: number;
  end_time: number;
}

export type Interval = [number, number];

export type Day = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

const DAYS: Day[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DAY_START = 0;
const DAY_END = 22; // 10PM, same bound used across all rooms in the original app

export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: Interval[] = [sorted[0]];

  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current[0] <= last[1]) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], current[1])];
    } else {
      merged.push(current);
    }
  }

  return merged;
}

export function freeTimes(meetingTimes: Interval[]): Interval[] {
  const merged = mergeIntervals(meetingTimes);
  const free: Interval[] = [];

  let current = DAY_START;
  for (const [start, end] of merged) {
    if (current < start) {
      free.push([current, start]);
    }
    current = Math.max(current, end);
  }

  if (current < DAY_END) {
    free.push([current, DAY_END]);
  }

  return free;
}

export interface RoomAvailability {
  room: string;
  label: string;
}

export function availClass(
  classList: Meeting[],
  selectedTime: number,
  selectedDay: Day,
  selectedBuilding: string
): RoomAvailability[] {
  const roomMeetings = new Map<string, Meeting[]>();

  for (const meeting of classList) {
    const matches =
      selectedBuilding === "all" || meeting.facility_id.includes(selectedBuilding);
    if (!matches) continue;
    if (!roomMeetings.has(meeting.facility_id)) {
      roomMeetings.set(meeting.facility_id, []);
    }
    roomMeetings.get(meeting.facility_id)!.push(meeting);
  }

  const results: RoomAvailability[] = [];

  for (const [room, meetings] of roomMeetings) {
    const busyByDay = new Map<Day, Interval[]>(DAYS.map((d) => [d, []]));

    for (const meeting of meetings) {
      const dayList = meeting.days.match(/.{2}/g) ?? [];
      for (const day of dayList as Day[]) {
        busyByDay.get(day)?.push([meeting.start_time, meeting.end_time]);
      }
    }

    const freeSlots = freeTimes(busyByDay.get(selectedDay) ?? []);

    const currentSlot = freeSlots.find(
      ([start, end]) => start < selectedTime && selectedTime < end
    );
    if (!currentSlot) continue;

    const availableFor = currentSlot[1] - selectedTime;
    const hours = Math.floor(availableFor);
    const minutes = Math.floor((availableFor % 1) * 60);
    results.push({
      room,
      label: `Free for ${hours} hours ${minutes} minutes`,
    });
  }

  return results;
}
