'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { AdminPageShell } from '@/components/admin/ui/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

export function BlogPostsPanel() {
  const [rows, setRows] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ posts: BlogRow[] }>('/api/super-admin/blog');
      setRows(res.posts);
    } catch {
      toast.error('بارگذاری وبلاگ ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDraft = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('عنوان و متن را وارد کنید');
      return;
    }
    try {
      await apiFetch('/api/super-admin/blog', {
        method: 'POST',
        body: JSON.stringify({ title, content, status: 'DRAFT' }),
      });
      setTitle('');
      setContent('');
      toast.success('پیش‌نویس ذخیره شد');
      void load();
    } catch {
      toast.error('ذخیره ناموفق بود');
    }
  };

  const publish = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/blog/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PUBLISHED' }),
      });
      toast.success('منتشر شد');
      void load();
    } catch {
      toast.error('انتشار ناموفق بود');
    }
  };

  return (
    <AdminPageShell section="blog" layout="form" description="مدیریت مقالات عمومی /blog">
      <div className="grid gap-4 rounded-xl border p-4">
        <h3 className="font-semibold">مقاله جدید</h3>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="متن (Markdown/HTML)" rows={6} />
        <Button type="button" onClick={() => void createDraft()}>
          ذخیره پیش‌نویس
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <span className="font-medium">{r.title}</span>
                <span className="mx-2 text-muted-foreground">/{r.slug}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{r.status}</span>
              </div>
              {r.status !== 'PUBLISHED' && (
                <Button size="sm" variant="outline" type="button" onClick={() => void publish(r.id)}>
                  انتشار
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
