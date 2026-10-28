'use client';

import { usePathname } from 'next/navigation';
import { useState, type JSX } from 'react';

export type CounterProps = {
  /** Heading shown above the counter. */
  label?: string;
  /** Count used when the component first mounts. */
  initialCount?: number;
};

export function Counter({ label = 'Shared counter', initialCount = 0 }: CounterProps): JSX.Element {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();

  return (
    <section className="counter" aria-label={label}>
      <span className="eyebrow">Client component</span>
      <h2>{label}</h2>
      <output className="counter-value" data-testid="count" aria-live="polite">
        {count}
      </output>
      <div className="counter-actions">
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Increment
        </button>
        <button className="secondary" type="button" onClick={() => setCount(initialCount)}>
          Reset
        </button>
      </div>
      <p className="counter-hint">One component, two compilers.</p>
      <div className="route-label">
        <span>Current route</span>
        <code data-testid="pathname">{pathname}</code>
      </div>
    </section>
  );
}
