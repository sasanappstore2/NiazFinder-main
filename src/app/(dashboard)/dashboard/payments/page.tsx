'use client';

import { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building,
  History,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const mockTransactions = [
  { id: '1', type: 'DEPOSIT', amount: 5000000, desc: 'واریز به کیف پول', date: '۱۴۰۳/۰۹/۱۵', status: 'COMPLETED' },
  { id: '2', type: 'PAYMENT', amount: -2000000, desc: 'پرداخت برای پروژه طراحی وب', date: '۱۴۰۳/۰۹/۱۴', status: 'COMPLETED' },
  { id: '3', type: 'WITHDRAW', amount: -1500000, desc: 'برداشت به حساب بانکی', date: '۱۴۰۳/۰۹/۱۰', status: 'PENDING' },
  { id: '4', type: 'BONUS', amount: 500000, desc: 'پاداش دعوت از دوستان', date: '۱۴۰۳/۰۹/۰۸', status: 'COMPLETED' },
  { id: '5', type: 'COMMISSION', amount: -100000, desc: 'کارمزد تراکنش', date: '۱۴۰۳/۰۹/۰۵', status: 'COMPLETED' },
];

function formatPrice(amount: number): string {
  const abs = Math.abs(amount);
  return new Intl.NumberFormat('fa-IR').format(abs) + ' تومان';
}

const txTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  DEPOSIT: { label: 'واریز', icon: ArrowDownLeft, color: 'text-emerald-600' },
  PAYMENT: { label: 'پرداخت', icon: ArrowUpRight, color: 'text-red-500' },
  WITHDRAW: { label: 'برداشت', icon: ArrowUpRight, color: 'text-orange-500' },
  BONUS: { label: 'پاداش', icon: ArrowDownLeft, color: 'text-emerald-600' },
  COMMISSION: { label: 'کارمزد', icon: ArrowUpRight, color: 'text-muted-foreground' },
  REFUND: { label: 'بازگشت', icon: ArrowDownLeft, color: 'text-blue-600' },
};

const txStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDING: { label: 'در انتظار', variant: 'secondary' },
  COMPLETED: { label: 'تکمیل', variant: 'default' },
  FAILED: { label: 'ناموفق', variant: 'destructive' },
  CANCELLED: { label: 'لغو شده', variant: 'outline' },
};

export default function PaymentsPage() {
  const [depositAmount, setDepositAmount] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">کیف پول</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مدیریت موجودی و تراکنش‌های مالی
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-emerald-100">
              <Wallet className="h-5 w-5" />
              <span className="text-sm">موجودی کل</span>
            </div>
            <p className="mt-2 text-3xl font-bold">۱۲,۵۰۰,۰۰۰</p>
            <p className="mt-1 text-sm text-emerald-200">تومان</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">در انتظار آزادسازی</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-amber-600">۳,۵۰۰,۰۰۰</p>
            <p className="mt-1 text-sm text-muted-foreground">تومان</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <History className="h-5 w-5" />
              <span className="text-sm">کل تراکنش‌ها</span>
            </div>
            <p className="mt-2 text-3xl font-bold">۴۷</p>
            <p className="mt-1 text-sm text-muted-foreground">تراکنش</p>
          </CardContent>
        </Card>
      </div>

      <Tabs dir="rtl" defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">تاریخچه تراکنش‌ها</TabsTrigger>
          <TabsTrigger value="deposit">واریز</TabsTrigger>
          <TabsTrigger value="withdraw">برداشت</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نوع</TableHead>
                    <TableHead>توضیحات</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead className="hidden sm:table-cell">تاریخ</TableHead>
                    <TableHead>وضعیت</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockTransactions.map((tx) => {
                    const typeCfg = txTypeConfig[tx.type];
                    const statusCfg = txStatusConfig[tx.status];
                    const Icon = typeCfg.icon;
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn('rounded-lg bg-accent p-1.5', typeCfg.color)}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-medium">{typeCfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.desc}
                        </TableCell>
                        <TableCell className={cn('font-medium text-sm', tx.amount > 0 ? 'text-emerald-600' : 'text-foreground')}>
                          {tx.amount < 0 ? '− ' : '+ '}{formatPrice(tx.amount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {tx.date}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusCfg.variant} className="text-xs">
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deposit Tab */}
        <TabsContent value="deposit">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>واریز به کیف پول</CardTitle>
              <CardDescription>مبلغ مورد نظر را وارد کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">مبلغ (تومان)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="مبلغ مورد نظر"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['۵۰۰,۰۰۰', '۱,۰۰۰,۰۰۰', '۵,۰۰۰,۰۰۰'].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setDepositAmount(amount.replace(/,/g, ''))}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
              <div className="rounded-lg bg-accent/50 p-3">
                <p className="text-sm text-muted-foreground">پرداخت از طریق درگاه بانکی امن</p>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                پرداخت و واریز
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>برداشت از کیف پول</CardTitle>
              <CardDescription>موجی قابل برداشت: ۱۲,۵۰۰,۰۰۰ تومان</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">مبلغ (تومان)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="مبلغ مورد نظر"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5" />
                  شماره شبا
                </Label>
                <Input
                  type="text"
                  placeholder="IR000000000000000000000000"
                  dir="ltr"
                  className="text-left font-mono"
                />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                ثبت درخواست برداشت
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
