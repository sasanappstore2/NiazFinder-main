'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Loc = {
  id: string;
  label: string;
  city: string;
  province: string | null;
  isPrimary: boolean;
  isPublished: boolean;
};

export function BusinessLocationsPanel() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [label, setLabel] = useState('');
  const [city, setCity] = useState('');

  const load = useCallback(async () => {
    const res = await apiFetch<{ locations: Loc[] }>('/api/business/me/locations');
    setLocations(res.locations);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!label.trim() || !city.trim()) {
      toast.error('برچسب و شهر را وارد کنید');
      return;
    }
    try {
      await apiFetch('/api/business/me/locations', {
        method: 'POST',
        body: JSON.stringify({ label, city }),
      });
      setLabel('');
      setCity('');
      toast.success('شعبه اضافه شد');
      void load();
    } catch {
      toast.error('خطا در ذخیره');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>شعب و موقعیت‌ها</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="نام شعبه" />
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="شهر" />
          <Button type="button" onClick={() => void add()}>
            افزودن
          </Button>
        </div>
        <ul className="divide-y rounded-lg border">
          {locations.map((l) => (
            <li key={l.id} className="flex justify-between px-3 py-2 text-sm">
              <span>
                {l.label} — {l.city}
                {l.isPrimary ? ' (اصلی)' : ''}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
