import { useEffect, useState } from "react";

/** Current time, re-rendering every `intervalMs` (default: each second, aligned to the clock). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    };
    timer = setTimeout(tick, intervalMs - (Date.now() % intervalMs));
    return () => clearTimeout(timer);
  }, [intervalMs]);
  return now;
}
