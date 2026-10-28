import type { JSX } from 'react';

export default function About(): JSX.Element {
  return (
    <>
      <span className="eyebrow">A real Next.js route</span>
      <h1>
        Different route.
        <br />
        Same state.
      </h1>
      <p className="intro">
        Next Link navigates without reloading this document. The shared layout keeps the counter
        mounted, while usePathname follows the App Router.
      </p>
      <div className="note">
        <h2>Two runtimes, not a simulation</h2>
        <p>
          The application uses Next.js routing and Turbopack. Only the isolated Storybook preview
          uses Vite and mocked navigation. Production runs with Next.js alone.
        </p>
      </div>
    </>
  );
}
