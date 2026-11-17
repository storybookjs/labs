import { AsyncLocalStorage } from 'node:async_hooks';

const VITE_PLUGIN_SCOPE = new AsyncLocalStorage<true>();

export function isInVitePluginScope(): boolean {
  return VITE_PLUGIN_SCOPE.getStore() === true;
}

export function runInVitePluginScope<T>(fn: () => Promise<T>): Promise<T> {
  return VITE_PLUGIN_SCOPE.run(true, fn);
}
