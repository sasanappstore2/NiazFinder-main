import { parseAllowedDevOrigins } from '@/lib/dev/allowed-dev-origins';

const saved = process.env.ALLOWED_DEV_ORIGINS;
process.env.ALLOWED_DEV_ORIGINS = '192.168.254.5:3000, 10.0.0.1:3000';

const origins = parseAllowedDevOrigins();
const hasDefault = origins.includes('localhost:3000') && origins.includes('127.0.0.1:3000');
const hasLan = origins.includes('192.168.254.5:3000');
const hasLanHost = origins.includes('192.168.254.5');
const deduped = origins.length === new Set(origins).size;

if (saved !== undefined) process.env.ALLOWED_DEV_ORIGINS = saved;
else delete process.env.ALLOWED_DEV_ORIGINS;

if (!hasDefault || !hasLan || !hasLanHost || !deduped) {
  console.error('allowed-dev-origins self-test FAILED', {
    origins,
    hasDefault,
    hasLan,
    hasLanHost,
    deduped,
  });
  process.exit(1);
}

console.log('allowed-dev-origins self-test OK');
