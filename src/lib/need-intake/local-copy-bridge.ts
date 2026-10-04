import type { ListingCopyContext } from '@/lib/need-intake/listing-copy-prompt';
import {
  buildListingCopySystemPrompt,
  buildListingCopyUserPrompt,
} from '@/lib/need-intake/listing-copy-prompt';
import type { ListingTitleContext } from '@/lib/need-intake/listing-title-prompt';
import {
  extractJsonFromChatContent,
  localChatCompletions,
} from '@/lib/need-intake/local-chat-client';
import {
  isAcceptableListingTitle,
  parseTitleFromModelOutput,
  rejectListingTitleReason,
} from '@/lib/need-intake/listing-title-sanitize';

export async function generateTitleViaLocalChat(
  context: ListingTitleContext,
  options?: { fallbackTitle?: string; sourceText?: string }
): Promise<{ title: string; raw: string } | null> {
  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'Write a short Persian listing title for NiazFinder. JSON only: {"title":"..."}',
      },
      {
        role: 'user',
        content: `Context: ${JSON.stringify(context)}\nFallback: ${options?.fallbackTitle ?? ''}`,
      },
    ],
    { maxTokens: 120, temperature: 0.2 }
  );
  if (!chat) return null;

  const json = extractJsonFromChatContent(chat.content) as { title?: string } | null;
  const rawTitle = json?.title?.trim() ?? parseTitleFromModelOutput(chat.content);
  if (!rawTitle) return null;

  const title = parseTitleFromModelOutput(rawTitle);
  const qualityCtx = { sourceText: options?.sourceText ?? context.sourceSummary };
  if (!isAcceptableListingTitle(title, qualityCtx)) {
    console.warn('local-llm title rejected:', rejectListingTitleReason(title, qualityCtx));
    return null;
  }
  return { title, raw: chat.content };
}

export async function generateListingCopyViaLocalChat(
  context: ListingCopyContext
): Promise<{ title: string; description: string; raw: string } | null> {
  const chat = await localChatCompletions(
    [
      { role: 'system', content: buildListingCopySystemPrompt() },
      { role: 'user', content: buildListingCopyUserPrompt(context) },
    ],
    { maxTokens: 512, temperature: 0.25 }
  );
  if (!chat) return null;

  const json = extractJsonFromChatContent(chat.content) as {
    title?: string;
    description?: string;
  } | null;

  const title = json?.title?.trim() ?? '';
  const description = json?.description?.trim() ?? '';
  if (!title && !description) return null;

  return { title, description, raw: chat.content };
}
