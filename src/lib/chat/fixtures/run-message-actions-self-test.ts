import {
  canDeleteForEveryone,
  DELETE_FOR_EVERYONE_MS,
  isHiddenForUser,
  parseDeletedFor,
  serializeDeletedFor,
} from '@/lib/chat/message-delete';
import {
  aggregateReactionCounts,
  isAllowedReactionEmoji,
  removeReactionFromList,
  upsertReactionInList,
} from '@/lib/chat/reactions';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(isAllowedReactionEmoji('👍'), 'like allowed');
assert(!isAllowedReactionEmoji('🔥'), 'custom emoji blocked');

const within = new Date(Date.now() - DELETE_FOR_EVERYONE_MS + 60_000);
assert(
  canDeleteForEveryone('u1', 'u1', within),
  'delete for everyone within window'
);
assert(
  !canDeleteForEveryone('u1', 'u2', within),
  'only sender'
);
const tooOld = new Date(Date.now() - DELETE_FOR_EVERYONE_MS - 1000);
assert(
  !canDeleteForEveryone('u1', 'u1', tooOld),
  'delete for everyone expired'
);

const deleted = serializeDeletedFor(['a', 'b']);
assert(parseDeletedFor(deleted).length === 2, 'parse deletedFor');
assert(isHiddenForUser(deleted, 'b'), 'hidden for user b');

let reactions = [{ emoji: '👍', userId: 'u1' }];
reactions = upsertReactionInList(reactions, { emoji: '❤️', userId: 'u1' });
assert(reactions.length === 1 && reactions[0].emoji === '❤️', 'one reaction per user');
reactions = upsertReactionInList(reactions, { emoji: '❤️', userId: 'u1' });
assert(reactions.length === 0, 'toggle off same emoji');
reactions = [{ emoji: '👍', userId: 'u1' }, { emoji: '👍', userId: 'u2' }];
reactions = removeReactionFromList(reactions, 'u1', '👍');
assert(reactions.length === 1 && reactions[0].userId === 'u2', 'remove one user reaction');

const counts = aggregateReactionCounts([
  { emoji: '👍', userId: 'a' },
  { emoji: '👍', userId: 'b' },
  { emoji: '❤️', userId: 'c' },
]);
assert(counts.find((c) => c.emoji === '👍')?.count === 2, 'aggregate like count');

console.log('message-actions self-test: ok');
