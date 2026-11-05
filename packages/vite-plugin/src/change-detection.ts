import {
  ChangeDetectionService,
  experimental_getStatusStore,
  resolveChangeDetectionAdapter,
  type StoryIndexGenerator,
} from 'storybook/internal/core-server';
import { logger } from 'storybook/internal/node-logger';
import { type Builder, CHANGE_DETECTION_STATUS_TYPE_ID } from 'storybook/internal/types';

type StopChangeDetection = () => Promise<void>;

/** Mirrors the wiring `storybookDevServer` does once the preview builder has started. */
export function startChangeDetection(options: {
  previewBuilder: Pick<Builder<unknown>, 'changeDetectionAdapter'>;
  storyIndexGeneratorPromise: Promise<StoryIndexGenerator>;
  workingDir: string;
}): StopChangeDetection {
  const service = new ChangeDetectionService({
    storyIndexGeneratorPromise: options.storyIndexGeneratorPromise,
    statusStore: experimental_getStatusStore(CHANGE_DETECTION_STATUS_TYPE_ID),
    workingDir: options.workingDir,
  });
  let adapter: ReturnType<NonNullable<Builder<unknown>['changeDetectionAdapter']>> | undefined;
  try {
    adapter = options.previewBuilder.changeDetectionAdapter?.();
  } catch (error) {
    logger.warn('Change detection: adapter initialisation failed');
    logger.debug(error instanceof Error ? (error.stack ?? error.message) : String(error));
  }
  // Resolving `undefined` lets readiness settle to `unavailable` instead of pending forever.
  resolveChangeDetectionAdapter(adapter);
  service.start();
  return () => service.dispose().catch(() => undefined);
}
