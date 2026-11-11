export const handle = ({
  event,
  resolve,
}: {
  event: unknown;
  resolve: (event: unknown) => unknown;
}) => resolve(event) ?? 'HOOKS-CANARY';
