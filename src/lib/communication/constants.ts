/** Redis pub/sub channel for communication gateway fanout */
export const COMM_REDIS_CHANNEL = 'comm:events';

export type CommRedisEventType =
  | 'message:new'
  | 'message:read-receipt'
  | 'conversation:unread-update'
  | 'conversation:deleted'
  | 'typing'
  | 'message:react'
  | 'message:edit'
  | 'message:delete'
  | 'message:pin'
  | 'message:star'
  | 'call:invite'
  | 'call:ringing'
  | 'call:accepted'
  | 'call:reject'
  | 'call:hangup';

export interface CommRedisEnvelope {
  type: CommRedisEventType;
  payload: Record<string, unknown>;
}
