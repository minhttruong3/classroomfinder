import ClassroomFinder from "@/app/components/ClassroomFinder";
import { getEstNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = getEstNow();

  return (
    <div className="container">
      <div className="title">ClassroomFinder @ BU</div>
      <div className="subtitle">
        Fall, 2026 | {now.dayName} {now.displayTime} EST
      </div>
      <ClassroomFinder initialDayName={now.dayName} initialDecimalTime={now.decimalTime} />
    </div>
  );
}
