import { getAgentLlmBaseUrl, getAgentLlmModel } from '@/lib/ai-agent/env';
import { getLocalModelConfig, localModelChatUrl } from '@/lib/need-intake/local-model-config';
import { localChatCompletions, localChatCompletionsStream } from '@/lib/need-intake/local-chat-client';
import { runGemma4AgentRound, streamGemma4AgentRound } from '@/lib/ai-agent/gemma4-agent';
import { AI_AGENT_SYSTEM_PROMPT } from '@/lib/ai-agent/prompt';

async function main() {
  const config = getLocalModelConfig();
  const agentBase = getAgentLlmBaseUrl().replace(/\/$/, '').replace(/\/v1$/, '');
  const merged = {
    ...config,
    baseUrl: agentBase || config.baseUrl,
    model: getAgentLlmModel() || config.model,
    timeoutMs: 120_000,
  };
  console.log('url', localModelChatUrl(merged));
  console.log('model', merged.model);

  const res = await localChatCompletions(
    [
      { role: 'system', content: AI_AGENT_SYSTEM_PROMPT },
      { role: 'user', content: 'سلام' },
    ],
    { config: merged, maxTokens: 400, temperature: 0.2, maxRetries: 0 },
  );
  console.log('direct content len', res?.content?.length ?? 0, JSON.stringify(res?.content)?.slice(0, 200));

  let reasoning = 0;
  let content = 0;
  for await (const d of localChatCompletionsStream(
    [
      { role: 'system', content: AI_AGENT_SYSTEM_PROMPT },
      { role: 'user', content: 'سلام' },
    ],
    { config: merged, maxTokens: 400, temperature: 0.2 },
  )) {
    if (d.reasoning) reasoning += d.reasoning.length;
    if (d.content) content += d.content.length;
  }
  console.log('stream chars reasoning', reasoning, 'content', content);

  const round = await runGemma4AgentRound(AI_AGENT_SYSTEM_PROMPT, [
    { role: 'user', content: 'سلام' },
  ]);
  console.log('round', round);

  for await (const ev of streamGemma4AgentRound(AI_AGENT_SYSTEM_PROMPT, [
    { role: 'user', content: 'سلام' },
  ])) {
    if (ev.type === 'complete') console.log('streamRound complete', ev.result);
    else console.log('streamRound', ev.type, JSON.stringify(ev.delta).slice(0, 80));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
