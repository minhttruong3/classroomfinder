import { NextRequest, NextResponse } from "next/server";
import { availClass, type Day } from "@/lib/availability";
import { masterList } from "@/lib/data";
import { getEstNow } from "@/lib/time";

const VALID_DAYS: Day[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const building = searchParams.get("building") ?? "all";
  const useNow = searchParams.get("now") === "true";

  let day: Day;
  let time: number;
  let dayName: string;
  let displayTime: string;

  if (useNow) {
    const est = getEstNow();
    day = est.dayAbbr;
    time = est.decimalTime;
    dayName = est.dayName;
    displayTime = est.displayTime;
  } else {
    const dayParam = searchParams.get("day");
    const timeParam = searchParams.get("time");

    if (!dayParam || !VALID_DAYS.includes(dayParam as Day)) {
      return NextResponse.json(
        { error: "Missing or invalid 'day' parameter" },
        { status: 400 }
      );
    }
    const parsedTime = Number(timeParam);
    if (timeParam === null || Number.isNaN(parsedTime)) {
      return NextResponse.json(
        { error: "Missing or invalid 'time' parameter" },
        { status: 400 }
      );
    }

    day = dayParam as Day;
    time = parsedTime;
    dayName = dayParam;
    displayTime = timeParam;
  }

  const rooms = availClass(masterList, time, day, building);

  return NextResponse.json({ count: rooms.length, rooms, day: dayName, time: displayTime });
}
