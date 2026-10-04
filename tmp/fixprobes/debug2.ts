import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
const data = require('@/../src/data/neighborhoods/catalog/tehran-city.json');
const hoods = (data.neighborhoods as ManagedNeighborhood[]).filter((n) =>
  n.id.includes('شهرک-دانشگاه'));
console.log('hoods:', hoods.map((h) => h.id));
const r = resolveTextNeighborhoodInCity(
  data.neighborhoods as ManagedNeighborhood[],
  '196 متر آپارتمان میخوام  شهرک دانشگاه تهران، ۱۲۲۴ میلیون رهن 66 میلیون اجاره',
  'تهران'
);
console.log(JSON.stringify({ hit: r.hit?.id, candidates: r.candidates.map((c) => c.id) }));
