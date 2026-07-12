import { db } from '@/lib/db';
import { agentMessageFeeToman } from '@/lib/ai-agent/env';
import {
  searchSiteCategories,
  searchSiteCities,
  searchSiteNeighborhoods,
} from '@/lib/ai-agent/site-data';
import { searchNeedsAgent } from '@/lib/ai-agent/vector-search';
import {
  explainNeedFieldsForVertical,
  getSiteHelpFaq,
} from '@/lib/ai-agent/knowledge/site-pack';
import {
  getUserMemoryTool,
  updateUserMemoryTool,
} from '@/lib/ai-agent/memory/user-memory';

export async function checkUserAccountStatus(userId: string) {
  const fee = agentMessageFeeToman();
  const [user, wallet, business] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true, isVerified: true, city: true },
    }),
    db.wallet.findUnique({ where: { userId } }),
    db.businessProfile.findUnique({
      where: { userId },
      select: { status: true, verified: true, name: true },
    }),
  ]);

  const balance = wallet?.balance ?? 0;
  const frozen = wallet?.frozen ?? 0;
  const available = balance - frozen;

  return {
    role: user?.role ?? 'CLIENT',
    accountType: business ? 'BUSINESS' : 'CUSTOMER',
    isVerified: user?.isVerified ?? false,
    city: user?.city ?? null,
    business: business
      ? { name: business.name, status: business.status, verified: business.verified }
      : null,
    wallet: {
      balance,
      frozen,
      available,
      agentMessageFee: fee,
      canAffordAgentMessage: available >= fee,
    },
  };
}

export async function getSiteCategories(args: Record<string, unknown>) {
  const depthRaw = typeof args.depth === 'number' ? args.depth : 1;
  const depth = Math.min(2, Math.max(1, Math.floor(depthRaw)));
  const limit = Math.min(
    40,
    Math.max(5, typeof args.limit === 'number' ? Math.floor(args.limit) : 25),
  );

  const roots = await db.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { order: 'asc' },
    take: limit,
    include: {
      children:
        depth >= 2
          ? {
              where: { isActive: true },
              orderBy: { order: 'asc' },
              take: 8,
              select: { id: true, name: true, slug: true },
            }
          : false,
    },
  });

  return {
    depth,
    count: roots.length,
    categories: roots.map((r) => ({
      name: r.name,
      slug: r.slug,
      children:
        depth >= 2 && Array.isArray(r.children)
          ? r.children.map((c) => ({ name: c.name, slug: c.slug }))
          : undefined,
    })),
    hint: 'برای جزئیات بیشتر search_site_categories را با query صدا بزن.',
  };
}

export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { userId: string },
) {
  switch (name) {
    case 'check_user_account_status':
      return checkUserAccountStatus(ctx.userId);
    case 'search_needs_agent':
      return searchNeedsAgent(args);
    case 'get_site_categories':
      return getSiteCategories(args);
    case 'search_site_categories':
      return searchSiteCategories(args);
    case 'search_site_cities':
      return searchSiteCities(args);
    case 'search_site_neighborhoods':
      return searchSiteNeighborhoods(args);
    case 'explain_need_fields': {
      const vertical =
        (typeof args.vertical === 'string' && args.vertical) ||
        (typeof args.category === 'string' && args.category) ||
        (typeof args.query === 'string' && args.query) ||
        'general';
      return explainNeedFieldsForVertical(vertical);
    }
    case 'get_site_help':
      return getSiteHelpFaq(
        typeof args.topic === 'string'
          ? args.topic
          : typeof args.query === 'string'
            ? args.query
            : undefined,
      );
    case 'get_user_memory':
      return getUserMemoryTool(ctx.userId);
    case 'update_user_memory':
      return updateUserMemoryTool(ctx.userId, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
