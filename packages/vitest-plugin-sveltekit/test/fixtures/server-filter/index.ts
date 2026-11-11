// The client side of a story: two remote files, and the app module the runtime imports. The
// runtime calls `loadServerHooks`; a global keeps it in this build.
import { loadServerHooks } from 'virtual:vitest-plugin-sveltekit/app';

import { format } from './src/lib/format.ts';
import './src/lib/a.remote.ts';
import './src/lib/b.remote.ts';

Object.assign(globalThis, { loadServerHooks, format });
