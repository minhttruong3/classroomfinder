"use client";

import { useEffect, useState } from "react";
import { getEstNow } from "@/lib/time";

export default function LiveClock() {
  const [now, setNow] = useState(getEstNow);

  useEffect(() => {
    const id = setInterval(() => setNow(getEstNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {now.dayName} {now.displayTime} EST
    </>
  );
}
