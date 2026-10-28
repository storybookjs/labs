import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { ButtonComponent } from './ButtonComponent';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shell">
      <p class="eyebrow">Angular CLI · One port</p>
      <h1>Angular CLI + Vite + Storybook</h1>
      <p class="intro">
        A real, zoneless Angular app served by <code>ng serve</code>. Its component workshop runs on
        the same port, from a Vite dev server mounted as development-server middleware.
      </p>

      <section class="counter-card" aria-labelledby="counter-title">
        <div>
          <p class="eyebrow">Shared component</p>
          <h2 id="counter-title">Give it a click</h2>
          <p>These buttons also render in Storybook.</p>
        </div>
        <output class="count" aria-label="Click count">{{ count() }}</output>
        <div class="actions">
          <example-button label="Add one" [primary]="true" (pressed)="increment()" />
          <example-button label="Reset" [disabled]="count() === 0" (pressed)="reset()" />
        </div>
      </section>

      <a class="storybook-link" href="/__storybook/?path=/story/example-button--primary">
        Open Storybook <span aria-hidden="true">↗</span>
      </a>
      <p class="footnote">
        Angular CLI owns the HTTP listener; Vite serves Storybook as middleware.
      </p>
    </main>
  `,
})
export class AppComponent {
  readonly count = signal(0);

  increment(): void {
    this.count.update((value) => value + 1);
  }

  reset(): void {
    this.count.set(0);
  }
}
