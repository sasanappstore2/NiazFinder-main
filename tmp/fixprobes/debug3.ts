import { resolveTextNeighborhoodInCity } from './rtn-debug';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
const data = require('@/../src/data/neighborhoods/catalog/tehran-city.json');
const r = resolveTextNeighborhoodInCity(
  data.neighborhoods as ManagedNeighborhood[],
  '196 متر آپارتمان میخوام  شهرک دانشگاه تهران، ۱۲۲۴ میلیون رهن 66 میلیون اجاره',
  'تهران'
);
console.log('RESULT', JSON.stringify({ hit: r.hit?.id, candidates: r.candidates.map((c) => c.id) }));
