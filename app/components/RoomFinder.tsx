"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LiveClock from "@/app/components/LiveClock";
import { formatClock, formatMins } from "@/lib/format";
import { DAYS, DAY_END, OPEN_HOUR, isCampusOpen } from "@/lib/rooms";
import type { Day } from "@/lib/availability";
import type { Named, OpeningRoom, FreeRoom, RoomFeed } from "@/lib/rooms";

type Mode = "now" | "pick";

const MODES: { id: Mode; label: string }[] = [
  { id: "now", label: "Free now" },
  { id: "pick", label: "Pick a time" },
];

type SortKey = "longest" | "ending" | "room";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "longest", label: "Longest free" },
  { key: "ending", label: "Ending soonest" },
  { key: "room", label: "Room (A–Z)" },
];

const BAR_MAX_MINS = 210; // a full bar = 3.5 hours
const SHORT_MINS = 60; // under this the bar turns amber
const SOON_WINDOW_HOURS = 2;
const REFRESH_MS = 60_000;
const TOP_BUILDINGS = 8; // shown before "Show all"

// "Pick a time" offers the opening hours in 30-minute steps.
const PICK_STEP = 0.5; // hours
const PICK_TIMES: number[] = Array.from(
  { length: (DAY_END - OPEN_HOUR) / PICK_STEP },
  (_, i) => OPEN_HOUR + i * PICK_STEP
);

function nearestPickTime(t: number): number {
  const snapped = Math.round(t / PICK_STEP) * PICK_STEP;
  return Math.min(PICK_TIMES[PICK_TIMES.length - 1], Math.max(PICK_TIMES[0], snapped));
}

function directionsUrl(buildingName: string): string {
  const q = encodeURIComponent(`${buildingName}, Boston University, Boston, MA`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function barClass(mins: number): string {
  return mins < SHORT_MINS ? "short" : "";
}

function barWidth(mins: number): string {
  return `${Math.min(100, Math.round((mins / BAR_MAX_MINS) * 100))}%`;
}

function plural(n: number): string {
  return n === 1 ? "room" : "rooms";
}

export default function RoomFinder({ initialFeed }: { initialFeed: RoomFeed }) {
  const [feed, setFeed] = useState<RoomFeed>(initialFeed);
  const [mode, setMode] = useState<Mode>("now");
  const [pickTime, setPickTime] = useState<number>(() => nearestPickTime(initialFeed.at));
  // Server "today" never changes during a visit that matters here, so the
  // default day and the "(today)" label come from the first feed.
  const todayAbbr: Day = DAYS.find((d) => d.name === initialFeed.day)?.abbr ?? "Mo";
  const [pickDay, setPickDay] = useState<Day>(todayAbbr);
  const [building, setBuilding] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [showAllBuildings, setShowAllBuildings] = useState(false);
  const [sort, setSort] = useState<SortKey>("longest");

  // Search and the building list take turns instead of stacking: stacking
  // them hides everything when the search names a different building than the
  // one selected. Picking a building clears the search; typing a search
  // switches back to all buildings so it looks everywhere.
  const selectBuilding = (code: string) => {
    setBuilding(code);
    setQuery("");
  };
  const changeSearch = (value: string) => {
    setQuery(value);
    if (value.trim() !== "") setBuilding("All");
  };

  const latest = useRef(0);
  const load = useCallback(async (when: { time: number; day: Day } | null) => {
    const id = ++latest.current;
    try {
      const res = await fetch(
        when === null ? "/api/rooms" : `/api/rooms?time=${when.time}&day=${when.day}`
      );
      if (!res.ok) return;
      const data: RoomFeed = await res.json();
      if (id === latest.current) setFeed(data);
    } catch {
      // Keep showing the last good list if the network blips.
    }
  }, []);

  // The server render already has fresh "now" data, so only fetch when the
  // picked day/time changes or when returning from "Pick a time"; otherwise
  // just keep the live lists current once a minute.
  const isPick = mode === "pick";
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
    } else {
      load(isPick ? { time: pickTime, day: pickDay } : null);
    }
    if (isPick) return;
    const timer = setInterval(() => load(null), REFRESH_MS);
    return () => clearInterval(timer);
  }, [isPick, pickTime, pickDay, load]);

  const q = query.trim().toLowerCase();
  const matchesQuery = (r: Named<FreeRoom | OpeningRoom>) =>
    !q || `${r.room} ${r.buildingName}`.toLowerCase().includes(q);
  const matchesBuilding = (r: { building: string }) =>
    building === "All" || r.building === building;

  const rows = feed.free;

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.building, (counts.get(r.building) ?? 0) + 1);
  // Busiest buildings first; the rest alphabetical behind "Show all". The
  // selected building is always kept visible, right under "All buildings".
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code]) => code);
  const top = ranked.slice(0, TOP_BUILDINGS);
  const pinned = building !== "All" && !top.includes(building) ? [building] : [];
  const rest = ranked.slice(TOP_BUILDINGS).filter((c) => c !== building).sort();
  const visible = [...pinned, ...top];
  const buildingButton = (code: string, extra = false) => (
    <button
      key={code}
      type="button"
      className={`bldg ${building === code ? "on" : ""} ${extra ? "extra" : ""}`}
      aria-pressed={building === code}
      onClick={() => selectBuilding(code)}
    >
      <span>{code}</span>
      <span className="n">{counts.get(code) ?? 0}</span>
    </button>
  );

  const byRoom = (a: { room: string }, b: { room: string }) =>
    a.room.localeCompare(b.room, undefined, { numeric: true });
  const compare = (a: Named<FreeRoom>, b: Named<FreeRoom>) => {
    if (sort === "room") return byRoom(a, b);
    return sort === "longest"
      ? b.freeUntil - a.freeUntil || byRoom(a, b)
      : a.freeUntil - b.freeUntil || byRoom(a, b);
  };
  const shown = rows.filter((r) => matchesBuilding(r) && matchesQuery(r)).sort(compare);

  const soon =
    mode === "now"
      ? feed.opening
          .filter(
            (o) =>
              o.opensAt - feed.at <= SOON_WINDOW_HOURS &&
              matchesBuilding(o) &&
              matchesQuery(o)
          )
          .slice(0, 3)
      : [];

  const pickLabel = formatClock(pickTime);
  // Outside opening hours nothing is "free now", whatever the class schedule says.
  const closed = mode === "now" && !isCampusOpen(feed.at);
  const beforeOpen = feed.at < OPEN_HOUR;
  const hours = `${formatClock(OPEN_HOUR)} – ${formatClock(DAY_END)}`;
  const heading = closed
    ? "Buildings are closed right now"
    : mode === "pick"
      ? `${shown.length} ${plural(shown.length)} free ${
          feed.day === initialFeed.day ? "" : `on ${feed.day} `
        }at ${pickLabel}`
      : `${shown.length} ${plural(shown.length)} free now`;
  const emptyNote = closed
    ? beforeOpen
      ? `Buildings are open ${hours}. Try “Pick a time” to see what is free from ${formatClock(OPEN_HOUR)}.`
      : `Buildings are open ${hours} and are closed for tonight. Check back tomorrow morning.`
    : "No free rooms match. Try another building or “Pick a time”.";

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <p className="eyebrow">
              <LiveClock />
            </p>
            <h1>Find an empty classroom at BU</h1>
          </div>
          <div className="controls">
            <label className="search">
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5F6368"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="sr">Search rooms or buildings</span>
              <input
                type="search"
                value={query}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Search a building or room (e.g. CAS, KCB 104)"
              />
            </label>
            <div className="when">
              <div className="seg" role="group" aria-label="When">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={mode === m.id ? "on" : ""}
                    aria-pressed={mode === m.id}
                    onClick={() => setMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {/* Always rendered so the hero keeps one height in both modes; hidden
                  (and out of the tab order) unless "Pick a time" is on. */}
              <div className={`pick ${mode === "pick" ? "" : "pick-hidden"}`}>
                <label>
                  <span className="sr">Day</span>
                  <select value={pickDay} onChange={(e) => setPickDay(e.target.value as Day)}>
                    {DAYS.map((d) => (
                      <option key={d.abbr} value={d.abbr}>
                        {d.name}
                        {d.abbr === todayAbbr ? " (today)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr">Time</span>
                  <select
                    value={pickTime}
                    onChange={(e) => setPickTime(Number(e.target.value))}
                  >
                    {PICK_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {formatClock(t)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="wrap layout">
        <aside aria-label="Buildings" className={showAllBuildings ? "expanded" : ""}>
          <h2 className="label">Buildings</h2>
          <button
            type="button"
            className={`bldg ${building === "All" ? "on" : ""}`}
            aria-pressed={building === "All"}
            onClick={() => selectBuilding("All")}
          >
            <span>All buildings</span>
            <span className="n">{rows.length}</span>
          </button>
          {visible.map((code) => buildingButton(code))}
          {rest.length > 0 && (
            <button
              type="button"
              className="bldg-toggle"
              aria-expanded={showAllBuildings}
              onClick={() => setShowAllBuildings((v) => !v)}
            >
              {showAllBuildings ? "Show fewer" : `Show all ${counts.size} buildings`}
            </button>
          )}
          {rest.map((code) => buildingButton(code, true))}
        </aside>

        <div className="content">
          <section>
            <div className="head">
              <h2>{heading}</h2>
              {!closed && (
                <label className="sort">
                  <span>Sort by</span>
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <ul className="rooms">
              {shown.length === 0 && <li className="empty">{emptyNote}</li>}
              {shown.map((r) => (
                <li className="room" key={r.room}>
                  <RoomName room={r.room} name={r.buildingName} />
                  <div>
                    <div className="until">
                      <span>
                        {r.restOfDay ? (
                          <strong>Free rest of day</strong>
                        ) : (
                          <>
                            Free until <strong>{formatClock(r.freeUntil)}</strong>
                          </>
                        )}
                      </span>
                      {!r.restOfDay && (
                        <span className="left-time">{formatMins(r.minsLeft)} left</span>
                      )}
                    </div>
                    <div className="bar">
                      <i
                        className={r.restOfDay ? "" : barClass(r.minsLeft)}
                        style={{ width: r.restOfDay ? "100%" : barWidth(r.minsLeft) }}
                      />
                    </div>
                  </div>
                  <div className="meta">
                    <a
                      className="dir"
                      href={directionsUrl(r.buildingName)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Directions
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {mode === "now" && soon.length > 0 && (
            <section>
              <h2 className="soon-title">Opening soon</h2>
              <div className="soon">
                {soon.map((s) => (
                  <div key={s.room}>
                    <strong className="soon-room">{s.room}</strong>
                    <span className="bname">{s.buildingName}</span>
                    <span className="soon-time">
                      Opens <strong>{formatClock(s.opensAt)}</strong> ·{" "}
                      {s.restOfDay ? "free rest of day" : `free ${formatMins(s.freeMins)}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

function RoomName({ room, name }: { room: string; name: string }) {
  return (
    <div>
      <span className="code">{room}</span>
      <span className="bname">{name}</span>
    </div>
  );
}
