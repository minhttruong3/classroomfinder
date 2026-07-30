import Link from "next/link";
import { availClass } from "@/lib/availability";
import { masterList } from "@/lib/data";
import { getEstNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = getEstNow();
  const bostonAvailableCount = availClass(
    masterList,
    now.decimalTime,
    now.dayAbbr,
    "all"
  ).length;

  return (
    <>
      <div className="landing-backdrop" />
      <div className="container">
        <div className="title">Find a Classroom</div>
        <div className="subtitle">
          Find empty classrooms on your campus in real time. Pick a school to
          get started.
        </div>
        <div className="school-list">
          <Link href="/boston-university" className="school-card">
            <span className="school-card-left">
              <span className="school-name">Boston University</span>
              <span className="availability-badge">
                {bostonAvailableCount} rooms available
              </span>
            </span>
            <span className="school-cta">Find a room →</span>
          </Link>
          <div className="school-card school-card-disabled">
            <span className="school-name">Harvard University</span>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>
          <div className="school-card school-card-disabled">
            <span className="school-name">Northeastern University</span>
            <span className="coming-soon-badge">Coming Soon</span>
          </div>
        </div>
      </div>
    </>
  );
}
