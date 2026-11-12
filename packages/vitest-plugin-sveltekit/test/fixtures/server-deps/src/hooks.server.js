import { session } from 'pkg-hooks';

export const handle = ({ event, resolve }) => resolve(session(event));
