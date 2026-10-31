// Stories and tests seed the database through the mocked `db.ts`, not by importing
// `__mocks__/db.ts`: Storybook serves the mock under the path of `db.ts`, so a direct import of
// the mock file would be a second module with a second database.
import type * as MockDb from './__mocks__/db.ts';
import * as db from './db.ts';

export const { resetDb, queryCount, setDatabaseDown } = db as unknown as typeof MockDb;
