import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

/** Shared keep-alive pool for high-concurrency LLM sidecar calls (Ollama, embed, etc.). */
export const llmHttpAgent = new HttpAgent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 100,
  maxFreeSockets: 10,
  scheduling: 'lifo',
});

export const llmHttpsAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 100,
  maxFreeSockets: 10,
  scheduling: 'lifo',
});
