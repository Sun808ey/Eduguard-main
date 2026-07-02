import { useEffect, useRef, useState } from 'react';

export function useCountUp(target, { duration = 1200, startWhenVisible = true, threshold = 0.45 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let cancelled = false;
    let started = false;
    let observer = null;

    const animate = () => {
      if (started || cancelled) return;
      started = true;
      const start = performance.now();

      const tick = (now) => {
        if (cancelled) return;
        const progress = Math.min((now - start) / duration, 1);
        setValue(Math.round(target * progress));
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };

      requestAnimationFrame(tick);
    };

    if (!startWhenVisible || !('IntersectionObserver' in window)) {
      animate();
      return () => {
        cancelled = true;
      };
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate();
          observer?.disconnect();
        }
      });
    }, { threshold });

    observer.observe(node);

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [duration, startWhenVisible, target, threshold]);

  return { ref, value };
}
