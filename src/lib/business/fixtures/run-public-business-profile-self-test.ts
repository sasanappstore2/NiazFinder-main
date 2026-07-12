import { isPublicBusinessProfile } from '@/lib/business/public-profile';

function assert(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

export function runPublicBusinessProfileSelfTest(): { passed: number; failed: string[] } {
  const failed = [
    assert(
      isPublicBusinessProfile({ status: 'ACTIVE', user: { isActive: true } }),
      'ACTIVE + active user → public'
    ),
    assert(
      !isPublicBusinessProfile({ status: 'INACTIVE', user: { isActive: true } }),
      'INACTIVE → not public'
    ),
    assert(
      !isPublicBusinessProfile({ status: 'ACTIVE', user: { isActive: false } }),
      'banned user → not public'
    ),
    assert(
      !isPublicBusinessProfile({ status: 'INACTIVE', user: { isActive: false } }),
      'INACTIVE + banned → not public'
    ),
  ].filter(Boolean) as string[];

  return { passed: 4 - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-public-business-profile-self-test'));

if (isDirectRun) {
  const { passed, failed } = runPublicBusinessProfileSelfTest();
  if (failed.length) {
    console.error('public-business-profile self-test FAILED');
    for (const f of failed) console.error(' -', f);
    process.exit(1);
  }
  console.log(`public-business-profile self-test OK (${passed} checks)`);
}
