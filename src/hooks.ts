import { useEffect, useState } from "react";

/** Eases a number from 0 up to `target`, for score reveals. */
export function useCountUp(target: number, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}
