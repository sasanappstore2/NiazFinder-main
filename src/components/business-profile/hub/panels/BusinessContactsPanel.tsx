'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { CONTACT_POINT_PRESETS } from '@/lib/business/team/constants';
import { cn } from '@/lib/utils';

type MemberRow = {
  id: string;
  role: string;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    phone: string | null;
  };
};

type ContactRow = {
  id: string;
  label: string;
  slug: string;
  description: string | null;
  assignedUserId: string;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  isPublished: boolean;
  isDefault: boolean;
  assignedUser: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
  };
};

type InviteRow = {
  id: string;
  phone: string;
  role: string;
  status: string;
};

function memberLabel(m: MemberRow) {
  return (
    m.user.displayName?.trim() ||
    `${m.user.firstName} ${m.user.lastName}`.trim() ||
    m.user.phone ||
    'عضو'
  );
}

export function BusinessContactsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'MANAGER'>('STAFF');
  const [newLabel, setNewLabel] = useState('');
  const [newAssignee, setNewAssignee] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/me/contact-points', {
        headers: getClientAuthHeaders(),
      });
      if (!res.ok) throw new Error('خطا در بارگذاری');
      const data = await res.json();
      setMembers(data.members ?? []);
      setContacts(data.contactPoints ?? []);
      setInvites(data.invites ?? []);
      setCanManageTeam(Boolean(data.teamAccess?.canManageTeam));
    } catch {
      toast.error('بارگذاری مخاطبین ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeMembers = members.filter((m) => m.status === 'ACTIVE');

  const handleInvite = async () => {
    if (!invitePhone.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/business/me/team', {
        method: 'POST',
        headers: { ...getClientAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: invitePhone.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا');
      toast.success(json.added ? 'عضو به تیم اضافه شد' : 'دعوت ارسال شد');
      setInvitePhone('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در دعوت');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async (preset?: { label: string; slug: string; description: string }) => {
    const label = preset?.label ?? newLabel.trim();
    const assignee = newAssignee || activeMembers[0]?.user.id;
    if (!label || !assignee) {
      toast.info('عنوان و عضو منتسب را مشخص کنید');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/business/me/contact-points', {
        method: 'POST',
        headers: { ...getClientAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          slug: preset?.slug,
          description: preset?.description,
          assignedUserId: assignee,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا');
      toast.success('مخاطب اضافه شد');
      setNewLabel('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setSaving(false);
    }
  };

  const patchContact = async (id: string, patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/business/me/contact-points/${id}`, {
        method: 'PATCH',
        headers: { ...getClientAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/business/me/contact-points/${id}`, {
        method: 'DELETE',
        headers: getClientAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا');
      toast.success('مخاطب حذف شد');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/business/me/team/${userId}`, {
        method: 'PATCH',
        headers: { ...getClientAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'خطا');
      toast.success('عضو از تیم حذف شد');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {canManageTeam && (
        <section className="space-y-4">
          <h3 className="text-sm font-semibold">تیم</h3>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{memberLabel(m)}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.role === 'OWNER' ? 'مالک' : m.role === 'MANAGER' ? 'مدیر' : 'کارمند'}
                    {m.status === 'INVITED' && ' · در انتظار'}
                  </p>
                </div>
                {m.role !== 'OWNER' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    disabled={saving}
                    onClick={() => void removeMember(m.user.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="rounded-lg border border-dashed border-border/60 px-3 py-2 text-sm text-muted-foreground"
              >
                دعوت {inv.phone} · {inv.role === 'MANAGER' ? 'مدیر' : 'کارمند'}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-phone">دعوت با موبایل</Label>
              <Input
                id="invite-phone"
                dir="ltr"
                placeholder="09..."
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
              />
            </div>
            <div className="w-full space-y-1 sm:w-36">
              <Label>نقش</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'STAFF' | 'MANAGER')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">کارمند</SelectItem>
                  <SelectItem value="MANAGER">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" disabled={saving} onClick={() => void handleInvite()}>
              <UserPlus className="size-4 ml-1" />
              دعوت
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">مخاطبین تماس</h3>
          <div className="flex flex-wrap gap-1">
            {CONTACT_POINT_PRESETS.map((p) => (
              <Button
                key={p.slug}
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || contacts.some((c) => c.slug === p.slug)}
                onClick={() => void handleAddContact(p)}
              >
                + {p.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className={cn(
                'rounded-xl border border-border/60 p-4 space-y-3',
                !c.isPublished && 'opacity-70'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.isDefault ? 'پیش‌فرض · ' : ''}
                    {memberLabel({
                      id: c.assignedUser.id,
                      role: 'STAFF',
                      status: 'ACTIVE',
                      user: { ...c.assignedUser, phone: null },
                    })}
                  </p>
                </div>
                {!c.isDefault && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    disabled={saving}
                    onClick={() => void removeContact(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>عضو منتسب</Label>
                  <Select
                    value={c.assignedUserId}
                    onValueChange={(v) => void patchContact(c.id, { assignedUserId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMembers.map((m) => (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          {memberLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={c.chatEnabled}
                      onCheckedChange={(v) => void patchContact(c.id, { chatEnabled: v })}
                    />
                    چت
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={c.isPublished}
                      onCheckedChange={(v) => void patchContact(c.id, { isPublished: v })}
                    />
                    نمایش
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-border/60 p-4 space-y-3">
          <p className="text-sm font-medium">مخاطب جدید</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="عنوان (مثلاً فروش)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
            />
            <Select value={newAssignee} onValueChange={setNewAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="عضو منتسب" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((m) => (
                  <SelectItem key={m.user.id} value={m.user.id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" disabled={saving} onClick={() => void handleAddContact()}>
            <Plus className="size-4 ml-1" />
            افزودن مخاطب
          </Button>
        </div>
      </section>
    </div>
  );
}
