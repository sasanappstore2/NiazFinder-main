import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AiAgentToolName } from './ai-agent-tools.schema';
import { AiAgentSiteDataService } from './ai-agent-site-data.service';
import { AiAgentVectorSearchService } from './ai-agent-vector-search.service';

@Injectable()
export class AiAgentToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteData: AiAgentSiteDataService,
    private readonly vectorSearch: AiAgentVectorSearchService,
  ) {}

  private agentMessageFee(): number {
    return Number(process.env.AGENT_MESSAGE_FEE_TOMAN ?? 500);
  }

  async checkUserAccountStatus(userId: string) {
    const fee = this.agentMessageFee();
    const [user, wallet, business] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, isVerified: true, city: true },
      }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.businessProfile.findUnique({
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

  async searchActiveNeeds(args: Record<string, unknown>) {
    const category = typeof args.category === 'string' ? args.category.trim() : '';
    const location = typeof args.location === 'string' ? args.location.trim() : '';
    const neighborhood = typeof args.neighborhood === 'string' ? args.neighborhood.trim() : '';
    const limitRaw = typeof args.limit === 'number' ? args.limit : 10;
    const limit = Math.min(20, Math.max(1, Math.floor(limitRaw)));

    const where: Record<string, unknown> = {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      moderationStatus: 'APPROVED',
      needAccessStatus: 'PUBLIC',
    };

    const locationFilters: Record<string, unknown>[] = [];
    if (location) {
      locationFilters.push(
        { city: { contains: location, mode: 'insensitive' } },
        { province: { contains: location, mode: 'insensitive' } },
      );
    }
    if (neighborhood) {
      locationFilters.push({ address: { contains: neighborhood, mode: 'insensitive' } });
      locationFilters.push({ description: { contains: neighborhood, mode: 'insensitive' } });
    }
    if (locationFilters.length === 1) {
      Object.assign(where, locationFilters[0]);
    } else if (locationFilters.length > 1) {
      where.OR = locationFilters;
    }

    if (category) {
      where.category = {
        OR: [
          { slug: { contains: category, mode: 'insensitive' } },
          { name: { contains: category, mode: 'insensitive' } },
        ],
      };
    }

    const rows = await this.prisma.serviceRequest.findMany({
      where: where as any,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        city: true,
        province: true,
        budgetMin: true,
        budgetMax: true,
        createdAt: true,
        category: { select: { name: true, slug: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      province: r.province,
      categoryName: r.category.name,
      categorySlug: r.category.slug,
      budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
      budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getSiteCategories(args: Record<string, unknown>) {
    const depthRaw = typeof args.depth === 'number' ? args.depth : 2;
    const depth = Math.min(3, Math.max(1, Math.floor(depthRaw)));

    const roots = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: depth >= 3
            ? {
                children: {
                  where: { isActive: true },
                  orderBy: { order: 'asc' },
                },
              }
            : undefined,
        },
      },
    });

    const mapNode = (c: {
      id: string;
      name: string;
      slug: string;
      icon: string | null;
      children?: Array<{
        id: string;
        name: string;
        slug: string;
        icon: string | null;
        children?: Array<{ id: string; name: string; slug: string; icon: string | null }>;
      }>;
    }, level: number): Record<string, unknown> => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      children:
        level < depth && c.children?.length
          ? c.children.map((child) => mapNode(child as any, level + 1))
          : [],
    });

    return roots.map((r) => mapNode(r as any, 1));
  }

  async executeTool(name: string, args: Record<string, unknown>, ctx: { userId: string }) {
    switch (name as AiAgentToolName) {
      case 'check_user_account_status':
        return this.checkUserAccountStatus(ctx.userId);
      case 'search_needs_agent':
        return this.vectorSearch.searchNeedsAgent(args);
      case 'get_site_categories':
        return this.getSiteCategories(args);
      case 'search_site_categories':
        return this.siteData.searchSiteCategories(args);
      case 'search_site_cities':
        return this.siteData.searchSiteCities(args);
      default:
        throw new BadRequestException(`Unknown tool: ${name}`);
    }
  }
}
