"use client";

import { useCallback, useEffect, useState } from "react";
import { classMap, dayMap } from "@/lib/data";
import type { RoomAvailability } from "@/lib/availability";

type Mode = "now" | "future" | null;

interface Props {
  initialDayName: string;
  initialDecimalTime: number;
}

function BuildingIcon() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="9" y1="7" x2="9" y2="7.01" />
      <line x1="15" y1="7" x2="15" y2="7.01" />
      <line x1="9" y1="11" x2="9" y2="11.01" />
      <line x1="15" y1="11" x2="15" y2="11.01" />
      <line x1="9" y1="15" x2="9" y2="15.01" />
      <line x1="15" y1="15" x2="15" y2="15.01" />
      <line x1="10" y1="21" x2="10" y2="17" />
      <line x1="14" y1="21" x2="14" y2="17" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  );
}

function decimalToTimeInputValue(decimal: number): string {
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal % 1) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeInputValueToDecimal(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h + m / 60;
}

function formatDisplayTime(decimal: number): string {
  const hours24 = Math.floor(decimal);
  const minutes = Math.round((decimal % 1) * 60);
  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${String(hours12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

export default function ClassroomFinder({
  initialDayName,
  initialDecimalTime,
}: Props) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [mode, setMode] = useState<Mode>(null);
  const [selectedDayName, setSelectedDayName] = useState<string>(initialDayName);
  const [timeInputValue, setTimeInputValue] = useState<string>(
    decimalToTimeInputValue(initialDecimalTime)
  );
  const [rooms, setRooms] = useState<RoomAvailability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryLabel, setQueryLabel] = useState<{ day: string; time: string } | null>(
    null
  );

  const buildingCode = selectedBuilding ? classMap[selectedBuilding] : "all";

  const fetchNow = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ building: buildingCode, now: "true" });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const data = await res.json();
      setRooms(data.rooms);
      setQueryLabel({ day: data.day, time: data.time });
    } finally {
      setLoading(false);
    }
  }, [buildingCode]);

  const fetchFuture = useCallback(
    async (dayName: string, timeValue: string) => {
      const dayAbbr = dayMap[dayName];
      if (!dayAbbr || !timeValue) return;
      setLoading(true);
      try {
        const decimalTime = timeInputValueToDecimal(timeValue);
        const params = new URLSearchParams({
          building: buildingCode,
          day: dayAbbr,
          time: String(decimalTime),
        });
        const res = await fetch(`/api/availability?${params.toString()}`);
        const data = await res.json();
        setRooms(data.rooms);
        setQueryLabel({ day: dayName, time: formatDisplayTime(decimalTime) });
      } finally {
        setLoading(false);
      }
    },
    [buildingCode]
  );

  // Refetch whenever an input changes while a mode is active, mirroring the
  // original Streamlit app rerunning display_data() on every widget interaction.
  // Genuine network fetch triggered by input changes, not derivable state.
  useEffect(() => {
    if (mode === "now") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchNow();
    } else if (mode === "future") {
      fetchFuture(selectedDayName, timeInputValue);
    }
  }, [mode, buildingCode, selectedDayName, timeInputValue, fetchNow, fetchFuture]);

  return (
    <>
      <label htmlFor="building">Select a Building</label>
      <select
        id="building"
        className="select"
        value={selectedBuilding}
        onChange={(e) => setSelectedBuilding(e.target.value)}
      >
        <option value="">Select a Building</option>
        {Object.keys(classMap).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <div className="button-row">
        <button
          type="button"
          className={`button ${mode === "now" ? "active" : ""}`}
          onClick={() => setMode("now")}
        >
          Available Now
        </button>
        <button
          type="button"
          className={`button ${mode === "future" ? "active" : ""}`}
          onClick={() => setMode("future")}
        >
          Future Availability
        </button>
      </div>

      {mode === "future" && (
        <div className="future-controls">
          <div>
            <label htmlFor="day">Select a Day</label>
            <select
              id="day"
              className="select"
              value={selectedDayName}
              onChange={(e) => setSelectedDayName(e.target.value)}
            >
              {Object.keys(dayMap).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="time">Select a Time</label>
            <input
              id="time"
              type="time"
              className="select"
              value={timeInputValue}
              onChange={(e) => setTimeInputValue(e.target.value)}
            />
          </div>
        </div>
      )}

      {mode && rooms && queryLabel && (
        <>
          <div className="results-heading">
            <strong>
              At {queryLabel.day} {queryLabel.time}, {rooms.length} room(s) were
              found:
            </strong>
          </div>
          {rooms.length === 0 ? (
            <div className="empty-state">No rooms available at this time.</div>
          ) : (
            <div className="results-grid">
              {rooms.map((r) => (
                <div className="card" key={r.room}>
                  <span className="room-label">
                    <BuildingIcon />
                    <strong>{r.room}</strong>
                  </span>
                  <span className="time-label">
                    <ClockIcon />
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {loading && <div className="empty-state">Loading…</div>}
    </>
  );
}
