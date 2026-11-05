import { addToGlobalContext } from 'storybook/internal/telemetry';

export type VitePluginTelemetryContext = {
  version: string;
  mode: 'embedded' | 'standalone';
  command: 'serve' | 'build';
};

export function getPluginVersion(): string {
  return __STORYBOOK_VITE_PLUGIN_VERSION__;
}

export function markPluginTelemetry(options: Omit<VitePluginTelemetryContext, 'version'>): void {
  const context: VitePluginTelemetryContext = { version: getPluginVersion(), ...options };
  addToGlobalContext('vitePlugin', context);
}
