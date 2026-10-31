import { addons } from 'storybook/preview-api';

import { EVENTS, type Mode, type ResultMessage, type SendMessage } from './shared.ts';

/** Runs one template in the story; returns a note for the panel's log. */
export type LivePanelHandler = (action: string, payload: unknown) => string | Promise<string>;

/**
 * Connects the current story to the "Live feed" panel. Call it in the story's `beforeEach` and
 * return its result: Storybook runs that cleanup before the next story, and the panel resets.
 */
export function connectLivePanel(mode: Mode, handle: LivePanelHandler): () => void {
  const channel = addons.getChannel();
  const announce = () => channel.emit(EVENTS.READY, { mode });

  const onSend = async ({ id, action, payload }: SendMessage) => {
    let ok = true;
    let note: string;
    try {
      note = await handle(action, payload);
    } catch (error) {
      ok = false;
      note = error instanceof Error ? error.message : String(error);
    }
    // Give the live query time to deliver (server mode waits for the next poll), then read what
    // the component shows.
    await new Promise((resolve) => setTimeout(resolve, mode === 'server' ? 500 : 150));
    const result: ResultMessage = { id, ok, note, component: describeLiveFeed() };
    channel.emit(EVENTS.RESULT, result);
  };

  channel.on(EVENTS.SEND, onSend);
  channel.on(EVENTS.HELLO, announce);
  announce();

  return () => {
    channel.off(EVENTS.SEND, onSend);
    channel.off(EVENTS.HELLO, announce);
    channel.emit(EVENTS.READY, null);
  };
}

/** The state of `LiveFeed.svelte` in one line, read from the canvas. */
function describeLiveFeed(): string {
  const root = document.querySelector('[aria-label="Live feed"]');
  if (!root) return 'not rendered';
  const text = (selector: string) => root.querySelector(selector)?.textContent?.trim();
  const status = text('[data-testid="feed-status"]');
  const alert = text('[role="alert"]');
  return alert
    ? `${alert} (${status})`
    : `${text('[data-testid="feed-count"]') ?? '–'} posts (${status})`;
}
