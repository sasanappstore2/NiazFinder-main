'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Gift,
  Percent,
  AlertCircle,
  Search,
  Plus,
  Minus,
} from 'lucide-react';
import { formatPrice, getTimeAgo } from '@/lib/constants';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';

// ============ Mock Data ============
const MOCK_TRANSACTIONS: (Transaction & { description: string })[] = [
  { id: 't1', type: 'DEPOSIT', amount: 5000000, description: 'شارژ کیف پول از درگاه زرین‌پال', status: 'COMPLETED', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 't2', type: 'PAYMENT', amount: 3500000, description: 'پرداخت به علی محمدی - طراحی سایت فروشگاهی', status: 'COMPLETED', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 't3', type: 'COMMISSION', amount: 175000, description: 'کمیسیون پروژه #1234', status: 'COMPLETED', createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 't4', type: 'REFUND', amount: 1000000, description: 'بازگشت وجه - لغو پروژه توسط کارفرما', status: 'COMPLETED', createdAt: new Date(Date.now() - 432000000).toISOString() },
  { id: 't5', type: 'WITHDRAW', amount: 2000000, description: 'برداشت به حساب بانکی ملت', status: 'PENDING', createdAt: new Date(Date.now() - 518400000).toISOString() },
  { id: 't6', type: 'BONUS', amount: 500000, description: 'جایزه ثبت‌نام اولیه', status: 'COMPLETED', createdAt: new Date(Date.now() - 604800000).toISOString() },
  { id: 't7', type: 'PAYMENT', amount: 8000000, description: 'پرداخت به سارا احمدی - طراحی لوگو برند', status: 'COMPLETED', createdAt: new Date(Date.now() - 864000000).toISOString() },
  { id: 't8', type: 'DEPOSIT', amount: 10000000, description: 'شارژ کیف پول - انتقال بانکی', status: 'COMPLETED', createdAt: new Date(Date.now() - 1209600000).toISOString() },
  { id: 't9', type: 'WITHDRAW', amount: 5000000, description: 'برداشت به حساب بانکی ملی', status: 'FAILED', createdAt: new Date(Date.now() - 1296000000).toISOString() },
  { id: 't10', type: 'COMMISSION', amount: 400000, description: 'کمیسیون پروژه #5678', status: 'COMPLETED', createdAt: new Date(Date.now() - 1440000000).toISOString() },
];

// ============ Transaction Type Config ============
const TRANSACTION_TYPE_CONFIG: Record<
  Transaction['type'],
  { label: string; icon: React.ElementType; color: string; bgColor: string; isIncome: boolean }
> = {
  DEPOSIT: {
    label: 'واریز',
    icon: ArrowDownLeft,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    isIncome: true,
  },
  WITHDRAW: {
    label: 'برداشت',
    icon: ArrowUpRight,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    isIncome: false,
  },
  PAYMENT: {
    label: 'پرداخت',
    icon: CreditCard,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    isIncome: false,
  },
  REFUND: {
    label: 'بازگشت وجه',
    icon: Plus,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/40',
    isIncome: true,
  },
  COMMISSION: {
    label: 'کمیسیون',
    icon: Percent,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    isIncome: false,
  },
  BONUS: {
    label: 'جایزه',
    icon: Gift,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    isIncome: true,
  },
};

// ============ Status Config ============
const STATUS_CONFIG: Record<
  Transaction['status'],
  { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  COMPLETED: { label: 'تکمیل شده', color: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800', variant: 'outline' },
  PENDING: { label: 'در انتظار', color: 'text-amber-700 bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800', variant: 'outline' },
  FAILED: { label: 'ناموفق', color: 'text-rose-700 bg-rose-100 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800', variant: 'outline' },
  CANCELLED: { label: 'لغو شده', color: 'text-gray-700 bg-gray-100 border-gray-200 dark:bg-gray-950/50 dark:text-gray-300 dark:border-gray-800', variant: 'outline' },
};

// ============ Filter Tab Config ============
type FilterTab = 'ALL' | 'DEPOSITS' | 'WITHDRAWALS' | 'PAYMENTS';

const FILTER_MAP: Record<FilterTab, Transaction['type'][]> = {
  ALL: ['DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND', 'COMMISSION', 'BONUS'],
  DEPOSITS: ['DEPOSIT', 'REFUND', 'BONUS'],
  WITHDRAWALS: ['WITHDRAW'],
  PAYMENTS: ['PAYMENT', 'COMMISSION'],
};

// ============ Animation Variants ============
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

const balanceCardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

// ============ Component ============
export function WalletHistory() {
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Computed wallet data
  const walletData = useMemo(() => {
    const totalBalance = 12500000;
    const frozenAmount = 2000000;
    const availableBalance = totalBalance - frozenAmount;
    return { totalBalance, frozenAmount, availableBalance };
  }, []);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((tx) => {
      const matchesTab = FILTER_MAP[activeTab].includes(tx.type);
      const matchesSearch =
        searchQuery.trim() === '' ||
        tx.description.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ============ Balance Overview Card ============ */}
      <motion.div variants={balanceCardVariants} initial="hidden" animate="visible">
        <Card className="relative overflow-hidden rounded-2xl border-0 shadow-lg">
          {/* Emerald gradient background */}
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500 via-emerald-600 to-teal-700" />

          {/* Decorative glass circles */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 backdrop-blur-sm" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5 backdrop-blur-sm" />
          <div className="pointer-events-none absolute -right-12 bottom-4 h-40 w-40 rounded-full bg-white/5 backdrop-blur-sm" />

          <CardContent className="relative z-10 p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">کیف پول</h3>
                  <p className="text-sm text-emerald-100">نیاز فایندر</p>
                </div>
              </div>

              {/* Balance Display */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-100/80">موجودی کل</p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                      {walletData.totalBalance.toLocaleString('fa-IR')}{' '}
                      <span className="text-lg font-semibold text-emerald-100/80 sm:text-xl">تومان</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Frozen */}
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                      <Minus className="h-4 w-4 text-emerald-200" />
                      <span className="text-xs font-medium text-emerald-100">مسدود شده:</span>
                      <span className="text-sm font-bold text-white">
                        {walletData.frozenAmount.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>

                    {/* Available */}
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 backdrop-blur-sm">
                      <Plus className="h-4 w-4 text-emerald-200" />
                      <span className="text-xs font-medium text-emerald-100">قابل برداشت:</span>
                      <span className="text-sm font-bold text-white">
                        {walletData.availableBalance.toLocaleString('fa-IR')} تومان
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button className="gap-2 rounded-xl bg-white text-emerald-700 shadow-md hover:bg-emerald-50 active:scale-95 transition-transform">
                    <Plus className="h-4 w-4" />
                    <span className="font-semibold">شارژ کیف پول</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 active:scale-95 transition-transform"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="font-semibold">برداشت</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ============ Transaction History ============ */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl"
      >
        <Card className="rounded-2xl shadow-lg shadow-emerald-500/5 border border-border/50">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-xl font-bold">تاریخچه تراکنش‌ها</CardTitle>
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="جستجو در تراکنش‌ها..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border-border/60 pr-9 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-300 transition-all"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filter Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
              <TabsList className="mb-5 h-10 w-full rounded-xl bg-muted/60 p-1 sm:w-fit">
                <TabsTrigger value="ALL" className="rounded-lg text-sm">
                  همه
                </TabsTrigger>
                <TabsTrigger value="DEPOSITS" className="rounded-lg text-sm">
                  واریزها
                </TabsTrigger>
                <TabsTrigger value="WITHDRAWALS" className="rounded-lg text-sm">
                  برداشت‌ها
                </TabsTrigger>
                <TabsTrigger value="PAYMENTS" className="rounded-lg text-sm">
                  پرداخت‌ها
                </TabsTrigger>
              </TabsList>

              {/* All tabs share the same content, filtered by activeTab */}
              <TabsContent value="ALL">
                <TransactionList transactions={filteredTransactions} />
              </TabsContent>
              <TabsContent value="DEPOSITS">
                <TransactionList transactions={filteredTransactions} />
              </TabsContent>
              <TabsContent value="WITHDRAWALS">
                <TransactionList transactions={filteredTransactions} />
              </TabsContent>
              <TabsContent value="PAYMENTS">
                <TransactionList transactions={filteredTransactions} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ============ Transaction List Sub-Component ============
function TransactionList({
  transactions,
}: {
  transactions: (Transaction & { description: string })[];
}) {
  if (transactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 shadow-sm">
          <AlertCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">تراکنشی یافت نشد</p>
          <p className="mt-1 text-sm text-muted-foreground">
            تراکنشی با فیلتر انتخابی شما پیدا نشد. فیلتر یا عبارت جستجو را تغییر دهید.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-1"
    >
      {transactions.map((tx, index) => (
        <TransactionRow key={tx.id} transaction={tx} index={index} />
      ))}
    </motion.div>
  );
}

// ============ Transaction Row Sub-Component ============
function TransactionRow({
  transaction,
  index,
}: {
  transaction: Transaction & { description: string };
  index: number;
}) {
  const config = TRANSACTION_TYPE_CONFIG[transaction.type];
  const statusConfig = STATUS_CONFIG[transaction.status];
  const Icon = config.icon;

  const isIncome = config.isIncome && transaction.status !== 'FAILED';
  const amountPrefix = isIncome ? '+' : '-';
  const amountColor = transaction.status === 'FAILED'
    ? 'text-muted-foreground line-through'
    : isIncome
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        'group flex items-center gap-3 sm:gap-4 rounded-xl px-3 py-3.5 sm:px-4 transition-all duration-200',
        'hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20',
        index % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'
      )}
    >
      {/* Type Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110',
          config.bgColor
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Type Label & Description */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{config.label}</span>
          <StatusBadge status={transaction.status} />
        </div>
        <p className="truncate text-sm text-muted-foreground">{transaction.description}</p>
      </div>

      {/* Amount & Date */}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className={cn('text-sm font-bold tabular-nums', amountColor)}>
          {amountPrefix}{formatPrice(transaction.amount)}
        </span>
        <span className="text-xs text-muted-foreground">{getTimeAgo(transaction.createdAt)}</span>
      </div>
    </motion.div>
  );
}

// ============ Status Badge Sub-Component ============
function StatusBadge({ status }: { status: Transaction['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      variant={config.variant}
      className={cn(
        'text-[10px] px-1.5 py-0 h-5 font-medium',
        config.color
      )}
    >
      {config.label}
    </Badge>
  );
}
