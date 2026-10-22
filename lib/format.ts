/** 13.75 -> "1:45 PM" */
export function formatClock(decimalHours: number): string {
  const total = Math.round(decimalHours * 60) % (24 * 60);
  const h24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** 141 -> "2h 21m", 51 -> "51m", 120 -> "2h" */
export function formatMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
