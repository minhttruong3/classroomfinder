import ClassroomFinder from "@/app/components/ClassroomFinder";
import LiveClock from "@/app/components/LiveClock";
import { getEstNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function BostonUniversity() {
  const now = getEstNow();

  return (
    <>
      <div className="page-backdrop" />
      <div className="container">
        <div className="title">ClassroomFinder @ BU</div>
        <div className="subtitle">
          Fall, 2026 | <LiveClock />
        </div>
        <ClassroomFinder initialDayName={now.dayName} initialDecimalTime={now.decimalTime} />
      </div>
    </>
  );
}
