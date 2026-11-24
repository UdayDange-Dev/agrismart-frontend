import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { prefersReducedMotion } from '../lib/motion';

/**
 * Fades/slides its content in once it scrolls into view (IntersectionObserver; opacity and
 * transform only, so no layout shift). With reduced motion, or without IntersectionObserver,
 * content is shown immediately.
 */
export function Reveal({
  as: Tag = 'div',
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined' || prefersReducedMotion());

  useEffect(() => {
    if (visible || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  const style: CSSProperties | undefined = delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined;
  return (
    <Tag ref={ref} className={`reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}
