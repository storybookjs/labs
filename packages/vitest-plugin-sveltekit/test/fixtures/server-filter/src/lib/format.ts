// A client module: its imports never reach the plugin's `resolveId` handler in a build.
export const format = (value: string) => value.trim();
