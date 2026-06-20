import 'server-only';

import amqp, { type ConfirmChannel } from 'amqplib';
import {
  queueEnv,
  RABBITMQ_DEFAULTS,
  workQueueArgs,
} from '@/lib/queue/topology';

const CHANNEL_POOL_SIZE = 4;

type PooledChannel = {
  channel: ConfirmChannel;
  inUse: boolean;
};

let connection: amqp.ChannelModel | null = null;
let topologyReady = false;
let connecting: Promise<void> | null = null;
const channelPool: PooledChannel[] = [];
const poolWaiters: Array<(ch: ConfirmChannel) => void> = [];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isEnabled() {
  const env = queueEnv();
  return env.enabled && env.url.length > 0;
}

async function assertTopology(ch: amqp.Channel) {
  const env = queueEnv();

  await ch.assertExchange(env.dlx, 'direct', { durable: true });
  await ch.assertQueue(env.dlq, { durable: true });
  await ch.bindQueue(env.dlq, env.dlx, env.dlq);

  await ch.assertExchange(env.exchange, 'topic', { durable: true });

  const queueArgs = workQueueArgs(env.dlx, env.dlq);

  const queues = [
    { name: env.intakeQueue, routingKey: env.routingIntake },
    { name: env.analyticsQueue, routingKey: env.routingAnalytics },
    { name: env.matchingQueue, routingKey: env.routingMatching },
  ];

  for (const q of queues) {
    await ch.assertQueue(q.name, queueArgs);
    await ch.bindQueue(q.name, env.exchange, q.routingKey);
  }
}

async function createChannelPool(conn: amqp.ChannelModel) {
  channelPool.length = 0;
  for (let i = 0; i < CHANNEL_POOL_SIZE; i++) {
    const channel = await conn.createConfirmChannel();
    channel.on('error', (err) => {
      console.error('[rabbitmq] channel error', err);
    });
    channelPool.push({ channel, inUse: false });
  }
}

async function connectOnce() {
  const env = queueEnv();
  let lastError: unknown;

  for (let attempt = 1; attempt <= env.connectRetries; attempt++) {
    try {
      const conn = await amqp.connect(env.url);
      connection = conn;

      conn.on('error', (err) => {
        console.error('[rabbitmq] connection error', err);
        connection = null;
        topologyReady = false;
      });
      conn.on('close', () => {
        connection = null;
        topologyReady = false;
        channelPool.length = 0;
      });

      const setupCh = await conn.createChannel();
      await assertTopology(setupCh);
      await setupCh.close();
      topologyReady = true;

      await createChannelPool(conn);
      console.info('[rabbitmq] connected and topology asserted');
      return;
    } catch (err) {
      lastError = err;
      const delay = env.connectDelayMs * attempt;
      console.warn(`[rabbitmq] connect attempt ${attempt}/${env.connectRetries} failed`, err);
      await sleep(delay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('RabbitMQ connect failed');
}

async function ensureConnected() {
  if (!isEnabled()) {
    throw new Error('RabbitMQ is not enabled');
  }
  if (connection && topologyReady && channelPool.length > 0) {
    return;
  }
  if (!connecting) {
    connecting = connectOnce().finally(() => {
      connecting = null;
    });
  }
  await connecting;
}

async function borrowChannel(): Promise<ConfirmChannel> {
  await ensureConnected();

  const free = channelPool.find((p) => !p.inUse);
  if (free) {
    free.inUse = true;
    return free.channel;
  }

  return new Promise<ConfirmChannel>((resolve) => {
    poolWaiters.push(resolve);
  });
}

function releaseChannel(channel: ConfirmChannel) {
  const pooled = channelPool.find((p) => p.channel === channel);
  if (pooled) {
    pooled.inUse = false;
    const waiter = poolWaiters.shift();
    if (waiter) {
      pooled.inUse = true;
      waiter(pooled.channel);
      return;
    }
  }
}

export async function initRabbitMQ(): Promise<void> {
  if (!isEnabled()) {
    return;
  }
  try {
    await ensureConnected();
  } catch (err) {
    console.error('[rabbitmq] init failed (non-fatal)', err);
  }
}

export function rabbitMQEnabled(): boolean {
  return isEnabled();
}

export type PublishOptions = {
  messageId?: string;
  correlationId?: string;
  headers?: Record<string, unknown>;
};

export async function publishToQueue(
  routingKey: string,
  payload: unknown,
  options: PublishOptions = {}
): Promise<void> {
  const env = queueEnv();
  const channel = await borrowChannel();

  try {
    const body = Buffer.from(JSON.stringify(payload));
    const headers: Record<string, unknown> = {
      [RABBITMQ_DEFAULTS.retryHeader]: 0,
      ...options.headers,
    };

    await new Promise<void>((resolve, reject) => {
      channel.publish(
        env.exchange,
        routingKey,
        body,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: options.messageId,
          correlationId: options.correlationId,
          headers,
        },
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } finally {
    releaseChannel(channel);
  }
}

export async function publishIntakeAiTask(
  payload: Record<string, unknown>,
  options?: PublishOptions
): Promise<void> {
  const env = queueEnv();
  await publishToQueue(env.routingIntake, payload, options);
}

export async function publishAnalyticsTelemetry(
  payload: Record<string, unknown>,
  options?: PublishOptions
): Promise<void> {
  const env = queueEnv();
  await publishToQueue(env.routingAnalytics, payload, options);
}

export async function publishBusinessMatch(
  payload: Record<string, unknown>,
  options?: PublishOptions
): Promise<void> {
  const env = queueEnv();
  await publishToQueue(env.routingMatching, payload, options);
}
