'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Template = { id: string; title: string; body: string };

export function ChatReplyTemplatePicker({ onPick }: { onPick: (body: string) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    apiFetch<{ templates: Template[] }>('/api/chat/templates')
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, []);

  if (templates.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" title="پاسخ‌های آماده">
          <FileText className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-xs">
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => onPick(t.body)}>
            {t.title}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
