"use client";

import { useEffect, useState } from "react";
import { getEstNow } from "@/lib/time";

const TERM_LABEL = "Fall 2026";

export default function LiveClock() {
  const [now, setNow] = useState(getEstNow);

  useEffect(() => {
    const id = setInterval(() => setNow(getEstNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {now.dayName} · {now.displayTime.replace(/^0/, "")} · {TERM_LABEL}
    </>
  );
}
