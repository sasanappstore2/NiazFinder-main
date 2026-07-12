/** Client/script-safe hybrid flag (no server-only imports). */
export function isHybridIntakeEnabled(): boolean {
  return process.env.NEED_INTAKE_HYBRID_ENABLED === 'true';
}
