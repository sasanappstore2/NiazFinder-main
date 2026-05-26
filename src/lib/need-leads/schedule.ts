import { dispatchNeedLeadOutreach } from './dispatch-outreach';

/** Fire-and-forget outreach after need publish (non-blocking). */
export function scheduleNeedLeadOutreach(requestId: string): void {
  void dispatchNeedLeadOutreach(requestId).catch((err) => {
    console.error('[need-leads] dispatch failed', requestId, err);
  });
}
