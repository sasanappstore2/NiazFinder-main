/** Dev-only routes and UI (dataset lab, export). */
export function isNeedIntakeDevToolsEnabled(): boolean {
  return process.env.NODE_ENV === 'development';
}
