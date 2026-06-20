import { enqueueIntakeHeavyJob } from '@/lib/need-intake/enqueue-heavy';
import { enqueueRequestModerationJob } from '@/lib/request-moderation/enqueue';

/** Post-create hooks for synchronous publish (no RabbitMQ / MLX worker). */
export function completeSyncPublish(
  serviceRequestId: string,
  options: {
    autoApprove: boolean;
    sessionId?: string;
  }
): void {
  if (!options.autoApprove) {
    enqueueRequestModerationJob(serviceRequestId);
  }
  void enqueueIntakeHeavyJob(serviceRequestId, options.sessionId);
}

export function syncPublishUserMessage(autoApprove: boolean): string {
  return autoApprove
    ? 'نیاز شما تأیید و منتشر شد'
    : 'نیاز ثبت شد و پس از بازبینی منتشر می‌شود';
}
