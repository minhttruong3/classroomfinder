import { masterList, classMap } from "@/lib/data";
import { formatClock } from "@/lib/format";
import { DAYS, freeRoomsAt, openingRoomsAfter, type RoomFeed } from "@/lib/rooms";
import type { Day } from "@/lib/availability";
import { getEstNow } from "@/lib/time";

// Display names come from the existing classMap (name -> code); these few
// read better under their room codes than the dropdown-era labels.
const NAME_OVERRIDES: Record<string, string> = {
  CAS: "College of Arts & Sciences",
  CDS: "Computing & Data Sciences",
};

const BUILDING_NAMES: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(classMap)
      .filter(([, code]) => code !== "all")
      .map(([name, code]) => [code, name])
  ),
  ...NAME_OVERRIDES,
};

export function buildingName(code: string): string {
  return BUILDING_NAMES[code] ?? code;
}

/**
 * Everything the finder page needs, at `at` (decimal hours) on `day`. Both
 * default to right now in America/New_York.
 */
export function getRoomFeed(at?: number, day?: Day): RoomFeed {
  const est = getEstNow();
  const t = at ?? est.decimalTime;
  const dayAbbr = day ?? est.dayAbbr;
  const named = <T extends { building: string }>(r: T) => ({
    ...r,
    buildingName: buildingName(r.building),
  });
  return {
    day: DAYS.find((d) => d.abbr === dayAbbr)?.name ?? est.dayName,
    checked: formatClock(est.decimalTime),
    at: t,
    free: freeRoomsAt(masterList, t, dayAbbr).map(named),
    opening: openingRoomsAfter(masterList, t, dayAbbr).map(named),
  };
}
