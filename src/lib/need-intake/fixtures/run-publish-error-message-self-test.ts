import assert from 'node:assert/strict';
import {
  PublishInfraError,
  formatNeedIntakePublishError,
} from '@/lib/need-intake/publish-error-message';
import { CategoryResolveError } from '@/lib/need-intake/resolve-category';

function run() {
  const infra = formatNeedIntakePublishError(
    new PublishInfraError('database_unavailable', 'db down', 503)
  );
  assert.equal(infra.status, 503);
  assert.equal(infra.code, 'database_unavailable');

  const prisma = formatNeedIntakePublishError({
    code: 'P1001',
    message: "Can't reach database server at `localhost:5432`",
  });
  assert.equal(prisma.status, 503);
  assert.equal(prisma.code, 'database_unavailable');
  assert.ok(prisma.message.includes('docker compose'));

  const category = formatNeedIntakePublishError(new CategoryResolveError('real-estate-sale'));
  assert.equal(category.status, 422);
  assert.equal(category.code, 'category_not_found');

  console.log('publish-error-message self-test: OK');
}

run();
