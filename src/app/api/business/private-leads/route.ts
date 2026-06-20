import { NextRequest, NextResponse } from 'next/server';
import { listPrivateLeads } from '@/lib/smart-matching/need-chat-session';
import { db } from '@/lib/db';
import { requireAuthUser, smartMatchingErrorResponse, proxyToNest } from '@/lib/smart-matching/api-helpers';

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuthUser(request);
  if (!user) return response!;

  const proxied = await proxyToNest(request, '/api/smart-matching/business/private-leads');
  if (proxied) return proxied;

  try {
    const [leads, wallet] = await Promise.all([
      listPrivateLeads(user.id),
      db.wallet.findUnique({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({
      leads,
      wallet: {
        balance: wallet?.balance ?? 0,
        frozen: wallet?.frozen ?? 0,
      },
    });
  } catch (err) {
    return smartMatchingErrorResponse(err);
  }
}
