<script setup lang="ts">
import { onMounted, ref } from 'vue';

import CounterButton from '~/components/CounterButton.vue';

const count = ref(0);
// Server-rendered markup is inert until hydration attaches the click handlers.
const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
});

function increment(): void {
  count.value += 1;
}

function reset(): void {
  count.value = 0;
}
</script>

<template>
  <main class="playground">
    <header class="masthead">
      <a class="brand" href="/" aria-label="Component lab home">
        <span class="brand-mark" aria-hidden="true">N</span>
        Component lab
      </a>
      <span class="badge">Nuxt 4 + TypeScript</span>
    </header>

    <section class="intro" aria-labelledby="page-title">
      <p class="eyebrow">Experimental Vite plugin</p>
      <h1 id="page-title">Nuxt + Vite + Storybook</h1>
      <p class="lede">
        Your app and its components, side by side. One dev server, with room to explore.
      </p>
    </section>

    <section class="demo" aria-labelledby="demo-title">
      <div class="counter-panel">
        <div class="panel-heading">
          <h2 id="demo-title">Live component</h2>
          <span class="live-indicator">{{ hydrated ? 'Reactive' : 'Server-rendered' }}</span>
        </div>
        <output class="count" aria-label="Click count" aria-live="polite">{{ count }}</output>
        <p class="counter-caption">A little state. A real Vue component, rendered by Nuxt.</p>
        <div class="actions">
          <CounterButton label="Add one" @click="increment" />
          <CounterButton label="Reset" variant="secondary" :disabled="count === 0" @click="reset" />
        </div>
      </div>

      <aside class="storybook-panel" aria-labelledby="storybook-title">
        <p class="eyebrow">Same component, another view</p>
        <h2 id="storybook-title">Meet it in Storybook.</h2>
        <p>
          Explore the button's primary and secondary states in isolation. Edit a story while your
          app keeps its place.
        </p>
        <a class="storybook-link" href="/__storybook/?path=/story/example-counter-button--primary">
          Open Storybook <span aria-hidden="true">↗</span>
        </a>
        <span class="route">/__storybook/</span>
      </aside>
    </section>

    <footer>
      <span>Nuxt pages and Vue components. Served by nuxt dev.</span>
      <span>App at / · Stories at /__storybook/</span>
    </footer>
  </main>
</template>

<style>
:root {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  color: #213c34;
  background: #edf5f0;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}

body {
  min-width: 320px;
  margin: 0;
}

a:focus-visible {
  outline: 3px solid #7654c4;
  outline-offset: 5px;
}

.playground {
  width: min(100% - 48px, 1000px);
  margin: 0 auto;
}

.masthead,
.brand,
.panel-heading,
.actions,
footer {
  display: flex;
  align-items: center;
}

.masthead {
  justify-content: space-between;
  gap: 16px;
  padding: 32px 0;
}

.brand {
  gap: 10px;
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 10px;
  background: #213c34;
  color: #a6ebc8;
}

.badge,
.live-indicator {
  border: 1px solid #ccded3;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
}

.intro {
  padding: 50px 0 40px;
}

.eyebrow {
  margin: 0 0 14px;
  color: #34715b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(34px, 5.2vw, 58px);
  letter-spacing: -0.045em;
  line-height: 1.12;
}

.lede {
  max-width: 560px;
  margin: 20px 0 0;
  color: #526c60;
  font-size: 18px;
  line-height: 1.7;
}

.demo {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  overflow: hidden;
  border: 1px solid #d4e2d9;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 16px 48px #213c3408;
}

.counter-panel,
.storybook-panel {
  padding: 36px;
}

.panel-heading {
  justify-content: space-between;
  gap: 12px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 16px;
}

.live-indicator {
  background: #effaf3;
  color: #34715b;
}

.count {
  display: block;
  margin: 26px 0 0;
  font-size: 88px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.counter-caption {
  margin: 10px 0 26px;
  color: #62796e;
  font-size: 14px;
}

.actions {
  flex-wrap: wrap;
  gap: 12px;
}

.storybook-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  background: #f5f9f6;
}

.storybook-panel h2 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.03em;
}

.storybook-panel > p:not(.eyebrow) {
  margin: 16px 0 24px;
  color: #526c60;
  line-height: 1.75;
}

.storybook-link {
  display: inline-flex;
  align-items: center;
  gap: 18px;
  min-height: 44px;
  color: #08715b;
  font-weight: 700;
  text-decoration-thickness: 1px;
  text-underline-offset: 5px;
}

.route {
  margin-top: 10px;
  color: #62796e;
  font:
    12px / 1.5 ui-monospace,
    monospace;
}

footer {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px;
  padding: 28px 0 40px;
  color: #62796e;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 680px) {
  .playground {
    width: calc(100% - 32px);
  }

  .masthead {
    flex-wrap: wrap;
  }

  .intro {
    padding-top: 24px;
  }

  .demo {
    grid-template-columns: 1fr;
  }

  .counter-panel,
  .storybook-panel {
    padding: 28px;
  }
}
</style>
