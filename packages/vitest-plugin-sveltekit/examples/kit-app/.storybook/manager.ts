// The "Live feed" panel: drives the live query of the `Live/Mocked` and `Live/Server` stories.
// Plain React without JSX; Storybook's manager provides `react` and the `storybook/*` modules.
import { createElement as h, useEffect, useState } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { STORY_CHANGED } from 'storybook/internal/core-events';
import { addons, types, useChannel } from 'storybook/manager-api';

import {
  ADDON_ID,
  EVENTS,
  explanations,
  type Mode,
  PANEL_ID,
  type ResultMessage,
  templates,
} from './live-panel/shared.ts';

interface LogEntry {
  id: number;
  label: string;
  sent: string;
  result?: ResultMessage;
}

let nextId = 1;
const format = (value: unknown) => JSON.stringify(value, null, 2);

function LivePanel() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState(0);
  const [text, setText] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);

  const emit = useChannel({
    [EVENTS.READY]: (ready: { mode: Mode } | null) => setMode(ready?.mode ?? null),
    [EVENTS.RESULT]: (result: ResultMessage) =>
      setLog((entries) =>
        entries.map((entry) => (entry.id === result.id ? { ...entry, result } : entry))
      ),
    // The panel starts over with each story; the new story announces its mode.
    [STORY_CHANGED]: () => setLog([]),
  });

  // The story may have announced itself before this panel existed.
  useEffect(() => emit(EVENTS.HELLO), []);

  // A new mode gets its first template.
  useEffect(() => {
    setSelected(0);
    setText(mode ? format(templates[mode][0]!.payload) : '');
    setLog([]);
  }, [mode]);

  if (!mode) {
    return h(
      'p',
      { style: { padding: 16 } },
      'Open Live/Mocked or Live/Server: this panel drives their live query.'
    );
  }

  const choices = templates[mode];
  const template = choices[selected]!;

  const choose = (index: number) => {
    setSelected(index);
    setText(format(choices[index]!.payload));
  };

  const send = () => {
    const id = nextId++;
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      const result = { id, ok: false, note: 'Not valid JSON, nothing sent', component: '' };
      setLog((entries) => [{ id, label: template.label, sent: text, result }, ...entries]);
      return;
    }
    setLog((entries) => [{ id, label: template.label, sent: JSON.stringify(payload) }, ...entries]);
    emit(EVENTS.SEND, { id, action: template.action, payload });
  };

  // Two columns, so the log stays in view in a short panel.
  const editor = h(
    'div',
    { style: { display: 'grid', gap: 10, flex: '0 1 640px', alignContent: 'start' } },
    h(
      'p',
      { style: { margin: 0 } },
      h('strong', { 'data-testid': 'live-panel-mode' }, mode === 'mocked' ? 'Mocked' : 'Server'),
      ' · ',
      explanations[mode]
    ),
    h(
      'label',
      { style: { display: 'flex', gap: 8, alignItems: 'center' } },
      'Template',
      h(
        'select',
        {
          value: selected,
          onChange: (event: { target: { value: string } }) => choose(Number(event.target.value)),
        },
        choices.map((choice, index) =>
          h('option', { key: choice.label, value: index }, choice.label)
        )
      )
    ),
    h('textarea', {
      'aria-label': 'Payload',
      rows: 6,
      spellCheck: false,
      value: text,
      onChange: (event: { target: { value: string } }) => setText(event.target.value),
      style: { fontFamily: 'monospace', fontSize: 13, padding: 8 },
    }),
    h('div', null, h('button', { type: 'button', onClick: send }, 'Send'))
  );

  return h(
    'div',
    { style: { padding: 16, display: 'flex', gap: 24 } },
    editor,
    h(
      'ol',
      {
        'aria-label': 'Log',
        style: { flex: 1, margin: 0, paddingLeft: 20, fontSize: 13, overflowWrap: 'anywhere' },
      },
      log.map((entry) =>
        h(
          'li',
          { key: entry.id, style: { marginBottom: 6 } },
          h('strong', null, entry.label),
          ' ',
          h('code', null, entry.sent),
          h(
            'div',
            null,
            entry.result
              ? `${entry.result.ok ? '→' : '✗'} ${entry.result.note}${
                  entry.result.component ? ` · component: ${entry.result.component}` : ''
                }`
              : '…'
          )
        )
      )
    )
  );
}

addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Live feed',
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => h(AddonPanel, { active: !!active }, h(LivePanel)),
  });
});
