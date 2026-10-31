// Shared by the manager panel (`../manager.ts`) and the stories (`./preview.ts`). No imports, so
// the manager bundle stays free of preview code.

export const ADDON_ID = 'kit-app/live-panel';
export const PANEL_ID = `${ADDON_ID}/panel`;

export const EVENTS = {
  /** Preview → manager: a story with a live query is ready (`{ mode }`), or gone (`null`). */
  READY: `${ADDON_ID}/ready`,
  /** Manager → preview: the panel opened; announce yourself again. */
  HELLO: `${ADDON_ID}/hello`,
  /** Manager → preview: run a template (`SendMessage`). */
  SEND: `${ADDON_ID}/send`,
  /** Preview → manager: what happened (`ResultMessage`). */
  RESULT: `${ADDON_ID}/result`,
} as const;

/** Mocked: `remote(getFeed).mockStream()`. Server: the real `getFeed` on the mocked database. */
export type Mode = 'mocked' | 'server';

export interface Template {
  label: string;
  action: string;
  payload: unknown;
}

export interface SendMessage {
  id: number;
  action: string;
  payload: unknown;
}

export interface ResultMessage {
  id: number;
  ok: boolean;
  /** What the story did. */
  note: string;
  /** What the component shows afterwards. */
  component: string;
}

export const explanations: Record<Mode, string> = {
  mocked:
    'Mocked: getFeed is a mockStream. Send pushes the value through SvelteKit’s live query runtime; invalid data fails the same check as the real handler.',
  server:
    'Server: the real getFeed polls the mocked database (PGlite). Send changes the database; the generator sends the change on its next poll.',
};

export const templates: Record<Mode, Template[]> = {
  mocked: [
    {
      label: 'Good data',
      action: 'emit',
      payload: {
        count: 3,
        latest: [
          { id: 3, title: 'Third post' },
          { id: 2, title: 'Second post' },
          { id: 1, title: 'First post' },
        ],
      },
    },
    {
      label: 'Invalid data',
      action: 'emit',
      payload: { count: 2, latest: [{ id: 2, title: '' }] },
    },
    { label: 'Error', action: 'error', payload: { status: 503, message: 'The feed is down' } },
    { label: 'End stream', action: 'end', payload: {} },
  ],
  server: [
    { label: 'Insert post', action: 'insert', payload: { title: 'Hello from the panel' } },
    { label: 'Delete latest post', action: 'delete-latest', payload: {} },
    { label: 'Set count to N', action: 'set-count', payload: { count: 5 } },
    { label: 'Invalid data (post without a title)', action: 'insert', payload: { title: ' ' } },
    { label: 'Error (database down)', action: 'database', payload: { down: true } },
    { label: 'Database up again', action: 'database', payload: { down: false } },
  ],
};
