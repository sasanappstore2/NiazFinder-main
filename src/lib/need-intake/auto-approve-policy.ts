/** Shared dev/staging auto-approve policy for need listings. */
export function shouldAutoApproveNeed(source?: string | null): boolean {
  if (process.env.NEED_INTAKE_AUTO_APPROVE === 'true') return true;
  if (process.env.NEED_INTAKE_AUTO_APPROVE === 'false') return false;
  if (process.env.NEED_AUTO_APPROVE_REQUESTS === 'true') return true;
  if (process.env.NEED_AUTO_APPROVE_REQUESTS === 'false') return false;
  if (process.env.NODE_ENV === 'production') return false;
  const intakeSources = new Set(['intake_chat', 'form']);
  if (source && !intakeSources.has(source)) return false;
  return true;
}
