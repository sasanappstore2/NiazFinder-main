/** V2 intake canary rollout — set NEXT_PUBLIC_V2_INTAKE_CANARY=true for gradual /v2 exposure. */
export function isV2IntakeCanaryEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_V2_INTAKE_CANARY === 'true') {
    return true;
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_V2_INTAKE_CANARY === 'false') {
    return false;
  }
  return false;
}
