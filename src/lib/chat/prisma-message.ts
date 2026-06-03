import type { MessageType, Prisma, PrismaClient } from '@prisma/client';

function isUnknownFieldError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'PrismaClientValidationError' ||
      error.message.includes('Unknown argument'))
  );
}

export function prismaHasExtendedMessageFields(db: PrismaClient): boolean {
  return typeof (db as PrismaClient & { userBlock?: unknown }).userBlock !== 'undefined';
}

export async function findMessageByClientTempId(
  db: PrismaClient,
  args: { conversationId: string; clientTempId: string; senderId: string }
) {
  if (!prismaHasExtendedMessageFields(db)) return null;
  try {
    return await db.message.findFirst({
      where: {
        conversationId: args.conversationId,
        clientTempId: args.clientTempId,
        senderId: args.senderId,
      },
    });
  } catch (error) {
    if (isUnknownFieldError(error)) return null;
    throw error;
  }
}

type CreateMessageInput = {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  clientTempId?: string;
  replyToId?: string;
};

export async function createChatMessage(
  tx: Prisma.TransactionClient,
  input: CreateMessageInput
) {
  const base = {
    conversationId: input.conversationId,
    senderId: input.senderId,
    content: input.content,
    type: input.type,
    isRead: false,
  };

  const extended = {
    ...base,
    clientTempId: input.clientTempId || undefined,
    replyToId: input.replyToId,
  };

  try {
    return await tx.message.create({ data: extended });
  } catch (error) {
    if (!isUnknownFieldError(error)) throw error;
    return await tx.message.create({ data: base });
  }
}
