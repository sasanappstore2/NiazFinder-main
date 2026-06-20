/** RabbitMQ topology ? shared names for producers and consumers. */

export const RABBITMQ_DEFAULTS = {
  exchange: 'niazfinder_topic',
  dlx: 'dlx_niazfinder',
  dlq: 'dlq_failed_tasks',
  intakeQueue: 'intake_ai_processing',
  analyticsQueue: 'analytics_telemetry',
  matchingQueue: 'business_matching',
  routingIntake: 'intake.ai',
  routingAnalytics: 'analytics.telemetry',
  routingMatching: 'business.match',
  retryHeader: 'x-retry-count',
  maxRetries: 3,
} as const;

export function queueEnv() {
  return {
    url: process.env.RABBITMQ_URL?.trim() ?? '',
    enabled: process.env.RABBITMQ_ENABLED === 'true',
    exchange: process.env.RABBITMQ_EXCHANGE?.trim() || RABBITMQ_DEFAULTS.exchange,
    dlx: process.env.RABBITMQ_DLX?.trim() || RABBITMQ_DEFAULTS.dlx,
    dlq: process.env.RABBITMQ_DLQ?.trim() || RABBITMQ_DEFAULTS.dlq,
    connectRetries: Number(process.env.RABBITMQ_CONNECT_RETRIES ?? 10),
    connectDelayMs: Number(process.env.RABBITMQ_CONNECT_DELAY_MS ?? 3000),
    publishConfirm: process.env.RABBITMQ_PUBLISH_CONFIRM !== 'false',
    routingIntake:
      process.env.RABBITMQ_ROUTING_INTAKE?.trim() || RABBITMQ_DEFAULTS.routingIntake,
    routingAnalytics:
      process.env.RABBITMQ_ROUTING_ANALYTICS?.trim() || RABBITMQ_DEFAULTS.routingAnalytics,
    routingMatching:
      process.env.RABBITMQ_ROUTING_MATCHING?.trim() || RABBITMQ_DEFAULTS.routingMatching,
    intakeQueue: process.env.INTAKE_QUEUE?.trim() || RABBITMQ_DEFAULTS.intakeQueue,
    analyticsQueue: process.env.ANALYTICS_QUEUE?.trim() || RABBITMQ_DEFAULTS.analyticsQueue,
    matchingQueue: process.env.MATCHING_QUEUE?.trim() || RABBITMQ_DEFAULTS.matchingQueue,
  };
}

export function workQueueArgs(dlx: string, dlqRoutingKey: string) {
  return {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlx,
      'x-dead-letter-routing-key': dlqRoutingKey,
    },
  };
}
