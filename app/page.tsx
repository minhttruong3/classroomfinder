import Link from "next/link";
import { masterList } from "@/lib/data";
import { freeRoomsAt, isCampusOpen } from "@/lib/rooms";
import { getEstNow } from "@/lib/time";

export const dynamic = "force-dynamic";

export default function Home() {
  const now = getEstNow();
  const campusOpen = isCampusOpen(now.decimalTime);
  const bostonAvailableCount = freeRoomsAt(masterList, now.decimalTime, now.dayAbbr).length;

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">Fall 2026</p>
            <h1>Find an empty classroom</h1>
          </div>
          <p className="hero-sub">Pick your school to see which rooms are free right now.</p>
        </div>
      </section>

      <main className="wrap landing">
        <h2 className="label">Schools</h2>
        <ul className="school-list">
          <li>
            <Link href="/boston-university" className="school-card">
              <span className="school-card-main">
                <span className="school-name">Boston University</span>
                {campusOpen ? (
                  <span className="availability-badge">
                    {bostonAvailableCount} rooms available
                  </span>
                ) : (
                  <span className="coming-soon-badge">Buildings closed</span>
                )}
              </span>
              <span className="school-cta">Find a room →</span>
            </Link>
          </li>
          <li className="school-card school-card-disabled">
            <span className="school-name">Harvard University</span>
            <span className="coming-soon-badge">Coming soon</span>
          </li>
          <li className="school-card school-card-disabled">
            <span className="school-name">Northeastern University</span>
            <span className="coming-soon-badge">Coming soon</span>
          </li>
        </ul>
      </main>
    </>
  );
}
