import 'dotenv/config';
import { spawnSync } from 'node:child_process';

// Prisma 6 SQLite schema engine can fail when RUST_LOG is inherited as warn/error.
// https://github.com/prisma/orm/issues/29355
const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: { ...process.env, RUST_LOG: 'info' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
