import assert from 'node:assert/strict';
import type { PropertyListing } from '@/contracts/business-profile';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import { buildFilingListCardModel } from '@/lib/filing/presentation/list-card-present';

function fileItem(listing: Partial<PropertyListing>): WorkspaceFileItem {
  return {
    kind: 'file',
    id: 'f1',
    listing: { id: 'f1', title: 'test', ...listing },
    dealLabel: '',
    categoryLabel: '',
    priceDisplay: '',
    colorLabel: '',
    createdAt: new Date().toISOString(),
  };
}

function main() {
  const sale = buildFilingListCardModel(
    fileItem({
      dealType: 'sell',
      price: '2200000000',
      area: '110',
      pricePerMeter: '20000000',
    })
  );
  assert.ok(sale.pricePerMeterLabel, 'sale should show price per meter');

  const rentEjare = buildFilingListCardModel(
    fileItem({
      dealType: 'rent_rahn_ejare',
      deposit: '500000000',
      monthlyRent: '12000000',
      area: '90',
      pricePerMeter: '20000000',
    })
  );
  assert.equal(rentEjare.pricePerMeterLabel, null, 'rent_rahn_ejare must not show price per meter');

  const rentFull = buildFilingListCardModel(
    fileItem({
      dealType: 'rent_rahn_full',
      deposit: '800000000',
      area: '95',
      pricePerMeter: '15000000',
    })
  );
  assert.equal(rentFull.pricePerMeterLabel, null, 'rent_rahn_full must not show price per meter');

  console.log('filing-list-card-present OK');
}

main();
