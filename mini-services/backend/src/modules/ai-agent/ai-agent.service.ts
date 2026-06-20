import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { AI_AGENT_SYSTEM_PROMPT } from './ai-agent-prompt';
import { AiAgentLlmService } from './ai-agent-llm.service';
import { AiAgentToolsService } from './ai-agent-tools.service';
import { AiAgentWalletService, PaymentRequiredException } from './ai-agent-wallet.service';
import { PlatformAiUserService } from './platform-ai-user.service';
import type { AiChatDto } from './dto/ai-chat.dto';
import type { AiAgentSseEvent, LlmChatMessage } from './ai-agent.types';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: AiAgentLlmService,
    private readonly tools: AiAgentToolsService,
    private readonly walletAgent: AiAgentWalletService,
    private readonly platformAi: PlatformAiUserService,
    private readonly redis: RedisService,
  ) {}

  private maxToolRounds(): number {
    return Number(process.env.AGENT_LLM_MAX_TOOL_ROUNDS ?? 3);
  }

  async *handleChatStream(userId: string, dto: AiChatDto): AsyncGenerator<AiAgentSseEvent> {
    if (!this.llm.isEnabled()) {
      yield {
        type: 'error',
        data: { code: 'AI_AGENT_DISABLED', message: 'دستیار هوشمند در حال حاضر غیرفعال است' },
      };
      return;
    }

    const platformAiId = await this.platformAi.getPlatformAiUserId();
    await this.assertPlatformBotConversation(userId, dto.conversationId, platformAiId);

    const idempotencyKey = `agent-msg:${dto.conversationId}:${dto.clientTempId}`;
    let feeDuplicate = false;
    let feeDeducted = false;

    try {
      const userMsg = await this.persistUserMessage(userId, dto);
      const feeResult = await this.walletAgent.deductInTransaction(userId, {
        idempotencyKey,
        referenceId: dto.conversationId,
      });
      feeDuplicate = feeResult.duplicate;
      feeDeducted = true;

      yield {
        type: 'fee_deducted',
        data: {
          transactionId: feeResult.transactionId,
          amount: feeResult.amount,
          duplicate: feeResult.duplicate,
        },
      };

      const existingAssistant = feeDuplicate
        ? await this.prisma.message.findFirst({
            where: {
              conversationId: dto.conversationId,
              senderId: platformAiId,
              clientTempId: `agent-reply:${dto.clientTempId}`,
            },
          })
        : null;

      if (existingAssistant) {
        yield { type: 'token', data: { delta: existingAssistant.content } };
        yield {
          type: 'done',
          data: {
            messageId: existingAssistant.id,
            content: existingAssistant.content,
            userMessageId: userMsg.id,
          },
        };
        return;
      }

      const history = await this.loadRecentMessages(dto.conversationId, userId, platformAiId, 20);
      let messages: LlmChatMessage[] = [
        { role: 'system', content: AI_AGENT_SYSTEM_PROMPT },
        ...history,
      ];

      let assistantText = '';

      for (let round = 0; round < this.maxToolRounds(); round++) {
        let completion = { text: '', toolCalls: [] as Array<{ id: string; name: string; arguments: Record<string, unknown> }> };
        const tokenBuffer: string[] = [];

        for await (const event of this.llm.chatRoundStream(messages)) {
          if (event.kind === 'token') {
            tokenBuffer.push(event.delta);
          } else {
            completion = event.result;
          }
        }

        if (completion.toolCalls.length === 0) {
          for (const delta of tokenBuffer) {
            yield { type: 'token', data: { delta } };
          }
          assistantText = completion.text;
          const saved = await this.persistAssistantMessage(
            dto.conversationId,
            platformAiId,
            assistantText,
            dto.clientTempId,
            userId,
          );
          yield {
            type: 'done',
            data: {
              messageId: saved.id,
              content: assistantText,
              userMessageId: userMsg.id,
            },
          };
          return;
        }

        messages.push({
          role: 'assistant',
          content: completion.text || null,
          tool_calls: completion.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        });

        for (const call of completion.toolCalls) {
          yield { type: 'tool_start', data: { name: call.name } };
          const result = await this.tools.executeTool(call.name, call.arguments, { userId });
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
      }

      throw new BadRequestException('AGENT_MAX_ROUNDS_EXCEEDED');
    } catch (err) {
      if (err instanceof PaymentRequiredException) {
        const body = err.getResponse() as { code?: string; error?: string };
        yield {
          type: 'error',
          data: {
            code: body.code ?? 'INSUFFICIENT_BALANCE',
            message: body.error ?? 'موجودی کیف پول کافی نیست',
          },
        };
        return;
      }

      if (feeDeducted && !feeDuplicate) {
        await this.walletAgent.refundOnFailure(userId, {
          idempotencyKey,
          referenceId: dto.conversationId,
          duplicate: feeDuplicate,
        });
      }

      this.logger.error('AI agent chat failed', err);
      const message =
        err instanceof ServiceUnavailableException
          ? 'سرویس هوش مصنوعی موقتاً در دسترس نیست'
          : err instanceof Error
            ? err.message
            : 'خطای سرور';
      yield { type: 'error', data: { code: 'AGENT_ERROR', message } };
    }
  }

  private async assertPlatformBotConversation(
    userId: string,
    conversationId: string,
    platformAiId: string,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد');

    const isParticipant =
      conversation.userId1 === userId || conversation.userId2 === userId;
    if (!isParticipant) throw new ForbiddenException('دسترسی به گفتگو مجاز نیست');

    const otherId =
      conversation.userId1 === userId ? conversation.userId2 : conversation.userId1;
    if (otherId !== platformAiId) {
      throw new BadRequestException('AI agent is only available in the platform assistant chat');
    }
  }

  private async persistUserMessage(userId: string, dto: AiChatDto) {
    const existing = await this.prisma.message.findFirst({
      where: { conversationId: dto.conversationId, clientTempId: dto.clientTempId },
    });
    if (existing) return existing;

    const content = dto.content.trim();
    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId: dto.conversationId,
          senderId: userId,
          content,
          type: 'TEXT',
          clientTempId: dto.clientTempId,
          replyToId: dto.replyToId ?? null,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
          },
        },
      });
      await tx.conversation.update({
        where: { id: dto.conversationId },
        data: { lastMessage: content.slice(0, 200), lastMessageAt: new Date() },
      });
      return created;
    });

    await this.publishMessage(dto.conversationId, userId, message);
    return message;
  }

  private async persistAssistantMessage(
    conversationId: string,
    platformAiId: string,
    content: string,
    clientTempId: string,
    recipientUserId: string,
  ) {
    const replyKey = `agent-reply:${clientTempId}`;
    const existing = await this.prisma.message.findFirst({
      where: { conversationId, clientTempId: replyKey },
    });
    if (existing) return existing;

    const message = await this.prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: platformAiId,
          content,
          type: 'TEXT',
          clientTempId: replyKey,
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
          },
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessage: content.slice(0, 200), lastMessageAt: new Date() },
      });
      return created;
    });

    await this.publishMessage(conversationId, platformAiId, message, recipientUserId);
    return message;
  }

  private async publishMessage(
    conversationId: string,
    senderId: string,
    message: {
      id: string;
      content: string;
      type: string;
      attachmentUrls?: string;
      isRead: boolean;
      createdAt: Date;
      sender: {
        id: string;
        firstName: string;
        lastName: string;
        displayName: string | null;
        avatar: string | null;
      };
    },
    notifyUserId?: string,
  ) {
    try {
      await this.redis.publish('chat:messages', {
        conversationId,
        senderId,
        message: {
          id: message.id,
          content: message.content,
          type: message.type,
          attachmentUrls: message.attachmentUrls ?? '[]',
          isRead: message.isRead,
          createdAt: message.createdAt,
          sender: {
            id: message.sender.id,
            displayName:
              message.sender.displayName ||
              `${message.sender.firstName} ${message.sender.lastName}`.trim(),
            avatar: message.sender.avatar,
          },
        },
      });
    } catch (err) {
      this.logger.warn('Redis publish failed for agent message', err);
    }

    if (notifyUserId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: notifyUserId,
            type: 'NEW_MESSAGE',
            title: 'پیام جدید',
            message: message.content.slice(0, 100),
            data: JSON.stringify({
              conversationId,
              messageId: message.id,
              senderId,
            }),
          },
        });
      } catch {
        // non-fatal
      }
    }
  }

  private async loadRecentMessages(
    conversationId: string,
    userId: string,
    platformAiId: string,
    limit: number,
  ): Promise<LlmChatMessage[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId, type: 'TEXT', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { senderId: true, content: true },
    });

    return rows
      .filter((m) => m.content.trim())
      .map((m) => ({
        role: m.senderId === platformAiId ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));
  }
}
