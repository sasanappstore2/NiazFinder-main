'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminFilterBar,
  AdminPageShell,
  type AdminColumn,
} from '@/components/admin/ui';

type FileRow = {
  path: string;
  relativePath?: string;
  size: number;
  modifiedAt: string;
};

export function FilesPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await apiFetch<{ files: FileRow[]; root: string }>(`/api/super-admin/files${params}`);
      setRows(res.files);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, q]);

  useEffect(() => { void load(); }, [load]);

  const columns: AdminColumn<FileRow>[] = [
    { id: 'path', header: 'مسیر', cell: (r) => <span className="font-mono text-xs" dir="ltr">{r.path}</span> },
    { id: 'size', header: 'حجم', cell: (r) => `${(r.size / 1024).toFixed(1)} KB` },
    { id: 'mod', header: 'تغییر', cell: (r) => new Date(r.modifiedAt).toLocaleString('fa-IR') },
  ];

  return (
    <AdminPageShell
      section="files"
      layout="table"
      description="مرور فایل‌های آپلود شده در سرور"
      actions={<AdminBadge variant="neutral">فقط مرور</AdminBadge>}
    >
      <AdminFilterBar search={q} onSearchChange={setQ} searchPlaceholder="جستجو مسیر..." />
      <AdminDataTable columns={columns} rows={rows.map((f, i) => ({ ...f, id: `${i}-${f.path}` }))} isLoading={isLoading} />
    </AdminPageShell>
  );
}
