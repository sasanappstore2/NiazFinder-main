import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const p = require.resolve('server-only');
require.cache[p] = {
  id: p,
  filename: p,
  loaded: true,
  exports: {},
} as NodeModule;
