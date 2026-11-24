import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/**
 * Counts up to `value` once visible. Only for real figures (e.g. live catalogue counts from
 * ERPNext), never for invented statistics. The final value is always in the accessible text.
 */
export function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const instant = prefersReducedMotion() || typeof IntersectionObserver === 'undefined';
  const [counted, setShown] = useState(0);
  const shown = instant ? value : counted;

  useEffect(() => {
    if (instant || !ref.current) return;
    let frame = 0;
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setShown(Math.round(value * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration, instant]);

  return (
    <span ref={ref} className="count-up">
      <span aria-hidden="true">{shown.toLocaleString('en-IN')}</span>
      <span className="visually-hidden">{value.toLocaleString('en-IN')}</span>
    </span>
  );
}
