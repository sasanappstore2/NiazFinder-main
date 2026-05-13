'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Eye, Clock, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const mockRequests = [
  { id: '1', title: 'طراحی وب‌سایت فروشگاهی', status: 'OPEN', proposals: 5, budget: '۵ تا ۱۵ میلیون', date: '۱۴۰۳/۰۹/۱۵', category: 'طراحی وب' },
  { id: '2', title: 'تولید محتوای شبکه اجتماعی', status: 'IN_PROGRESS', proposals: 8, budget: '۲ تا ۵ میلیون', date: '۱۴۰۳/۰۹/۱۰', category: 'محتوا' },
  { id: '3', title: 'توسعه اپلیکیشن موبایل', status: 'COMPLETED', proposals: 12, budget: '۲۰ تا ۵۰ میلیون', date: '۱۴۰۳/۰۸/۲۰', category: 'موبایل' },
  { id: '4', title: 'سئو سایت شرکتی', status: 'CLOSED', proposals: 3, budget: '۳ تا ۸ میلیون', date: '۱۴۰۳/۰۸/۰۵', category: 'سئو' },
];

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  OPEN: { label: 'باز', variant: 'default', icon: Clock },
  IN_PROGRESS: { label: 'در حال انجام', variant: 'secondary', icon: Eye },
  COMPLETED: { label: 'تکمیل شده', variant: 'outline', icon: CheckCircle },
  CLOSED: { label: 'بسته شده', variant: 'destructive', icon: XCircle },
};

export default function DashboardRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRequests = mockRequests.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch =
      !searchQuery || r.title.includes(searchQuery) || r.category.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">درخواست‌های من</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مدیریت و پیگیری درخواست‌های خدماتی شما
          </p>
        </div>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          ثبت درخواست جدید
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'کل درخواست‌ها', value: '۲۴', color: 'text-foreground' },
          { label: 'درخواست‌های باز', value: '۸', color: 'text-emerald-600' },
          { label: 'در حال انجام', value: '۶', color: 'text-blue-600' },
          { label: 'تکمیل شده', value: '۱۰', color: 'text-amber-600' },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={cn('mt-1 text-3xl font-bold', stat.color)}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی درخواست..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9"
          />
        </div>
        <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="OPEN">باز</SelectItem>
            <SelectItem value="IN_PROGRESS">در حال انجام</SelectItem>
            <SelectItem value="COMPLETED">تکمیل شده</SelectItem>
            <SelectItem value="CLOSED">بسته شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead className="hidden sm:table-cell">دسته‌بندی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="hidden md:table-cell">بودجه</TableHead>
                <TableHead className="hidden md:table-cell">تاریخ</TableHead>
                <TableHead className="text-center">پیشنهادها</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => {
                const status = statusConfig[req.status];
                const StatusIcon = status.icon;
                return (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-accent/50">
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{req.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={status.variant}
                        className="gap-1"
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {req.budget}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {req.date}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {req.proposals}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    درخواستی یافت نشد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
