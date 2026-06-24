import { db } from '@/lib/db';
import { agentMessageFeeToman } from '@/lib/ai-agent/env';
import {
  searchSiteCategories,
  searchSiteCities,
} from '@/lib/ai-agent/site-data';
import { searchNeedsAgent } from '@/lib/ai-agent/vector-search';
import { getPublicCategoryWhere } from '@/lib/categories/category-status';

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
  const depthRaw = typeof args.depth === 'number' ? args.depth : 2;
  const depth = Math.min(3, Math.max(1, Math.floor(depthRaw)));

  const roots = await db.category.findMany({
    where: getPublicCategoryWhere({ parentId: null }),
    orderBy: { order: 'asc' },
    include: {
      children: {
        where: getPublicCategoryWhere(),
        orderBy: { order: 'asc' },
        include:
          depth >= 3
            ? { children: { where: getPublicCategoryWhere(), orderBy: { order: 'asc' } } }
            : undefined,
      },
    },
  });

  const mapNode = (c: any, level: number): Record<string, unknown> => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    children:
      level < depth && c.children?.length
        ? c.children.map((child: any) => mapNode(child, level + 1))
        : [],
  });

  return roots.map((r) => mapNode(r, 1));
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
