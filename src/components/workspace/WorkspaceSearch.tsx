'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function WorkspaceSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:max-w-xs lg:max-w-sm">
      <Search className="pointer-events-none absolute top-1/2 end-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="جستجو در نیازها، فایل‌ها و همکاری‌ها..."
        className="h-9 pe-9 text-sm"
        aria-label="جستجوی میزکار"
      />
    </div>
  );
}
