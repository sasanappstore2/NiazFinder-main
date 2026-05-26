'use client';

import { Building2, Globe, Hash, Users } from 'lucide-react';
import type { SectionProps } from './types';

export function CompanyProfileSection({ business }: SectionProps) {
  const company = business.extensions?.company;
  if (!company) return null;

  const rows = [
    { icon: Building2, label: 'نام رسمی', value: company.legalName },
    { icon: Hash, label: 'شماره ثبت', value: company.registrationNumber },
    { icon: Building2, label: 'حوزه فعالیت', value: company.industry },
    { icon: Users, label: 'تعداد پرسنل', value: company.employeeCount },
    { icon: Globe, label: 'وب‌سایت', value: company.website },
    {
      icon: Building2,
      label: 'سال تأسیس',
      value: company.foundedYear ? String(company.foundedYear) : undefined,
    },
  ].filter((r) => r.value);

  if (rows.length === 0 && !company.description) return null;

  return (
    <section id="section-companyProfile" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">مشخصات شرکت</h2>
      {company.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{company.description}</p>
      )}
      {rows.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-start gap-3 rounded-xl border bg-card p-4"
            >
              <row.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="mt-0.5 text-sm font-medium">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
