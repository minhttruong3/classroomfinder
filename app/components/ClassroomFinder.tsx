"use client";

import { useCallback, useEffect, useState } from "react";
import { classMap, dayMap } from "@/lib/data";
import type { RoomAvailability } from "@/lib/availability";

type Mode = "now" | "future" | null;

interface Props {
  initialDayName: string;
  initialDecimalTime: number;
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

type Period = "AM" | "PM";

function timeInputValueToParts(value: string): {
  hour12: number;
  minute: number;
  period: Period;
} {
  const [hour24, minute] = value.split(":").map(Number);
  const period: Period = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

function partsToTimeInputValue(hour12: number, minute: number, period: Period): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_OPTIONS = [0, 15, 30, 45];

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
  const [timeInputValue, setTimeInputValue] = useState<string>(() => {
    const nearestQuarterHour = (Math.round(initialDecimalTime * 4) / 4) % 24;
    return decimalToTimeInputValue(nearestQuarterHour);
  });
  const [rooms, setRooms] = useState<RoomAvailability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryLabel, setQueryLabel] = useState<{ day: string; time: string } | null>(
    null
  );

  const buildingCode = selectedBuilding ? classMap[selectedBuilding] : "all";
  const { hour12, minute, period } = timeInputValueToParts(timeInputValue);

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
        <span
          className={`button-row-thumb ${mode === "future" ? "position-future" : ""} ${mode ? "" : "position-hidden"}`}
        />
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
            <label htmlFor="time-hour">Select a Time</label>
            <div className="time-select-row">
              <select
                id="time-hour"
                className="select"
                aria-label="Hour"
                value={hour12}
                onChange={(e) =>
                  setTimeInputValue(
                    partsToTimeInputValue(Number(e.target.value), minute, period)
                  )
                }
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className="select"
                aria-label="Minute"
                value={minute}
                onChange={(e) =>
                  setTimeInputValue(
                    partsToTimeInputValue(hour12, Number(e.target.value), period)
                  )
                }
              >
                {MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className="select"
                aria-label="AM or PM"
                value={period}
                onChange={(e) =>
                  setTimeInputValue(
                    partsToTimeInputValue(hour12, minute, e.target.value as Period)
                  )
                }
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {mode && rooms && queryLabel && (
        <>
          <div className="results-heading">
            <strong>
              At {queryLabel.day} {queryLabel.time}, {rooms.length}{" "}
              {rooms.length === 1 ? "room was" : "rooms were"} found:
            </strong>
          </div>
          {rooms.length === 0 ? (
            <div className="empty-state">No rooms available at this time.</div>
          ) : (
            <div className="results-grid">
              {rooms.map((r) => (
                <div className="card" key={r.room}>
                  <span className="room-label">
                    <strong>{r.room}</strong>
                  </span>
                  <span className="time-label">{r.label}</span>
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
