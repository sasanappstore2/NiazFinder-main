import type { MessageReactionItem } from '@/lib/types';

export const REACTION_LIKE = '👍';
export const REACTION_DISLIKE = '👎';
export const REACTION_LOVE = '❤️';

export const CHAT_REACTION_EMOJIS = [REACTION_LIKE, REACTION_DISLIKE, REACTION_LOVE] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

export function isAllowedReactionEmoji(emoji: string): emoji is ChatReactionEmoji {
  return (CHAT_REACTION_EMOJIS as readonly string[]).includes(emoji);
}

/** One reaction per user — keep latest emoji only */
export function upsertReactionInList(
  list: MessageReactionItem[],
  entry: MessageReactionItem
): MessageReactionItem[] {
  const withoutUser = list.filter((r) => r.userId !== entry.userId);
  const same = list.find((r) => r.userId === entry.userId && r.emoji === entry.emoji);
  if (same) {
    return withoutUser;
  }
  return [...withoutUser, entry];
}

export function removeReactionFromList(
  list: MessageReactionItem[],
  userId: string,
  emoji: string
): MessageReactionItem[] {
  return list.filter((r) => !(r.userId === userId && r.emoji === emoji));
}

export function aggregateReactionCounts(
  reactions: MessageReactionItem[]
): { emoji: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
  }
  return CHAT_REACTION_EMOJIS.map((emoji) => ({
    emoji,
    count: map.get(emoji) ?? 0,
  })).filter((x) => x.count > 0);
}
