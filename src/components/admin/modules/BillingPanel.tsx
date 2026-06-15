'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminFilterBar,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type TransactionRow = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
  user: { id: string; phone: string; displayName: string | null };
};

type WalletDetail = {
  wallet: {
    balance: number;
    frozen: number;
    user: { phone: string; displayName: string | null };
    recentTransactions: Array<{
      id: string;
      type: string;
      amount: number;
      status: string;
      createdAt: string;
    }>;
  };
};

export function BillingPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [walletUserId, setWalletUserId] = useState<string | null>(null);
  const [walletDetail, setWalletDetail] = useState<WalletDetail | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        transactions: TransactionRow[];
        pagination: { totalPages: number; total: number };
      }>(`/api/super-admin/transactions?page=${page}&limit=20`);
      setRows(res.transactions);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openWallet = async (userId: string) => {
    setWalletUserId(userId);
    setWalletLoading(true);
    setWalletDetail(null);
    try {
      const res = await apiFetch<WalletDetail>(`/api/super-admin/wallets/${userId}`);
      setWalletDetail(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627 \u062f\u0631 \u0628\u0627\u0632 \u06a9\u06cc\u0641 \u067e\u0648\u0644');
      setWalletUserId(null);
    } finally {
      setWalletLoading(false);
    }
  };

  const refund = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/transactions/${id}/refund`, { method: 'POST' });
      toast.success('refund \u062b\u0628\u062a \u0634\u062f');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627');
    }
  };

  const columns: AdminColumn<TransactionRow>[] = [
    { id: 'type', header: '\u0646\u0648\u0639', cell: (r) => r.type },
    { id: 'amount', header: '\u0645\u0628\u0644\u063a', cell: (r) => r.amount.toLocaleString('fa-IR') },
    {
      id: 'status',
      header: '\u0648\u0636\u0639\u06cc\u062a',
      cell: (r) => (
        <AdminBadge variant={r.status === 'COMPLETED' ? 'success' : 'warning'}>{r.status}</AdminBadge>
      ),
    },
    {
      id: 'user',
      header: '\u06a9\u0627\u0631\u0628\u0631',
      cell: (r) => (
        <button
          type="button"
          className="text-(--color-coloredText) hover:underline"
          onClick={() => void openWallet(r.userId)}
        >
          {r.user.displayName ?? r.user.phone}
        </button>
      ),
    },
    {
      id: 'at',
      header: '\u062a\u0627\u0631\u06cc\u062e',
      cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR'),
    },
  ];

  return (
    <AdminPageShell section="billing" layout="table" description={'\u062a\u0631\u0627\u06a9\u0646\u200c\u0647\u0627 \u0648 \u06a9\u06cc\u0641 \u067e\u0648\u0644'}>
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        rowActions={
          hasPermission('billing:transactions:write')
            ? (r) =>
                r.status === 'COMPLETED' ? (
                  <Button size="sm" variant="ghost" onClick={() => refund(r.id)}>
                    Refund
                  </Button>
                ) : null
            : undefined
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <Sheet open={Boolean(walletUserId)} onOpenChange={(open) => !open && setWalletUserId(null)}>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{'\u06a9\u06cc\u0641 \u067e\u0648\u0644 \u06a9\u0627\u0631\u0628\u0631'}</SheetTitle>
          </SheetHeader>
          {walletLoading ? (
            <p className="py-8 text-sm text-muted-foreground">{'\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc\u2026'}</p>
          ) : walletDetail ? (
            <div className="mt-4 space-y-4 text-sm">
              <p>
                {walletDetail.wallet.user.displayName ?? walletDetail.wallet.user.phone}
              </p>
              <p>
                {'\u0645\u0648\u062c\u0648\u062f\u06cc: '}
                {walletDetail.wallet.balance.toLocaleString('fa-IR')}
                {' \u2014 '}
                {'\u0645\u0633\u062f\u0648\u062f: '}
                {walletDetail.wallet.frozen.toLocaleString('fa-IR')}
              </p>
              <ul className="space-y-2">
                {walletDetail.wallet.recentTransactions.map((t) => (
                  <li key={t.id} className="rounded-lg border p-2">
                    <span>{t.type}</span>
                    {' \u2014 '}
                    <span>{t.amount.toLocaleString('fa-IR')}</span>
                    {' \u2014 '}
                    <span>{t.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}
