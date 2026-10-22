import { NextRequest, NextResponse } from "next/server";
import type { Day } from "@/lib/availability";
import { getRoomFeed } from "@/lib/room-feed";
import { DAYS } from "@/lib/rooms";

export const dynamic = "force-dynamic";

// GET /api/rooms                       -> right now (America/New_York)
// GET /api/rooms?time=13.75            -> today at 1:45 PM
// GET /api/rooms?time=13.75&day=Sa     -> Saturday at 1:45 PM
// `day` is one of Mo Tu We Th Fr Sa Su.
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const timeParam = params.get("time");
  const dayParam = params.get("day");

  let day: Day | undefined;
  if (dayParam !== null) {
    const match = DAYS.find((d) => d.abbr === dayParam);
    if (!match) {
      return NextResponse.json(
        { error: `'day' must be one of ${DAYS.map((d) => d.abbr).join(", ")}` },
        { status: 400 }
      );
    }
    day = match.abbr;
  }

  let time: number | undefined;
  if (timeParam !== null) {
    time = Number(timeParam);
    if (timeParam.trim() === "" || !Number.isFinite(time) || time < 0 || time >= 24) {
      return NextResponse.json(
        { error: "'time' must be decimal hours from 0 up to 24" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(getRoomFeed(time, day));
}
