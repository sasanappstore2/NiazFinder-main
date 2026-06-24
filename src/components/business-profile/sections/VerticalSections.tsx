'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPriceText } from '@/lib/format/money';
import type { Business } from '@/contracts/business-profile';
import { ListingGrid } from '@/components/business-profile/widgets/_ListingGrid';
import { activeListings, getListings } from '@/lib/business/real-estate-listings';
import { profileUsesListingsTab } from '@/lib/business/real-estate-listings-display';
import { RealEstateListingsSection } from './RealEstateListingsSection';
import type { SectionProps } from './types';

export function ListingsSection({ business, requestId }: SectionProps) {
  if (profileUsesListingsTab(business)) {
    return <RealEstateListingsSection business={business} requestId={requestId} />;
  }

  const listings = activeListings(getListings(business));
  if (listings.length === 0) return null;

  return (
    <section id="section-listings" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">آگهی‌های فعال</h2>
      <ListingGrid
        listings={listings}
        emptyText="هنوز آگهی فعالی ثبت نشده است."
        business={business}
        requestId={requestId}
      />
    </section>
  );
}

export function MenuSection({ business }: SectionProps) {
  const menu = business.extensions?.restaurant?.menu ?? [];
  if (menu.length === 0) return null;

  return (
    <section id="section-menu" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">منو</h2>
      <Card>
        <CardContent className="divide-y pt-4">
          {menu.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="font-medium">{m.name}</p>
                {m.description && (
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                )}
              </div>
              {m.price && (
                <span className="shrink-0 text-sm font-semibold text-primary">
                  {formatPriceText(m.price)}
                </span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

export function CredentialsSection({ business }: SectionProps) {
  const ext = business.extensions;
  const hasDoctor = (ext?.doctor?.specialties?.length ?? 0) > 0;
  const hasMechanic = (ext?.mechanic?.supportedBrands?.length ?? 0) > 0;
  const hasSalon = (ext?.salon?.serviceStyles?.length ?? 0) > 0;
  const licenseBadges = business.trust.badges.filter((b) =>
    /مجوز|پروانه|وکیل|تخصص|بیمه/i.test(b)
  );

  if (!hasDoctor && !hasMechanic && !hasSalon && licenseBadges.length === 0) return null;

  return (
    <section id="section-credentials" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">تخصص‌ها و مجوزها</h2>
      <div className="space-y-3">
        {hasDoctor && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">تخصص‌های پزشکی</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {ext!.doctor!.specialties.map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </CardContent>
            {ext!.doctor!.insuranceAccepted.length > 0 && (
              <CardContent className="border-t pt-3 text-sm text-muted-foreground">
                بیمه‌های طرف قرارداد: {ext!.doctor!.insuranceAccepted.join('، ')}
              </CardContent>
            )}
          </Card>
        )}
        {hasMechanic && (
          <Card>
            <CardContent className="pt-4 text-sm">
              <span className="font-medium">برندهای پشتیبانی‌شده: </span>
              {ext!.mechanic!.supportedBrands.join('، ')}
              {ext!.mechanic!.emergencyService && (
                <Badge className="mr-2" variant="destructive">خدمات اضطراری</Badge>
              )}
            </CardContent>
          </Card>
        )}
        {hasSalon && (
          <Card>
            <CardContent className="flex flex-wrap gap-1.5 pt-4">
              {ext!.salon!.serviceStyles.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </CardContent>
          </Card>
        )}
        {licenseBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {licenseBadges.map((b) => (
              <Badge key={b} variant="secondary">{b}</Badge>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
