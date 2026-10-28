import type { JSX } from 'react';

export default function Home(): JSX.Element {
  return (
    <>
      <span className="eyebrow">Next.js + Vite Storybook</span>
      <h1>
        One app.
        <br />
        Two workbenches.
      </h1>
      <p className="intro">
        A real App Router app, with its component playground right next door. One development
        address. Independent compilers. Shared components.
      </p>
      <div className="feature-list">
        <div>
          <span>01</span>
          <p>Rendered by Next.js, hydrated by React.</p>
        </div>
        <div>
          <span>02</span>
          <p>Previewed in Storybook, powered by Vite.</p>
        </div>
        <div>
          <span>03</span>
          <p>Increment the counter, then visit About. Your state stays with you.</p>
        </div>
      </div>
    </>
  );
}
