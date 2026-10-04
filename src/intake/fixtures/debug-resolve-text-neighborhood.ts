import { resolveTextNeighborhoodInCity } from '@/lib/need-intake/resolve-text-neighborhood';
import { loadCityNeighborhoods } from '@/lib/neighborhoods/catalog';

async function main() {
  const hoods = await loadCityNeighborhoods('tehran-city');
  console.log('catalog:', hoods.length);
  const cases: Array<[string, string]> = [
    ['من یک آپارتمان ۱۸۰ متری در سباری نیاوران تهران میخوام ۱۰۰ میلیون رهن دارم', 'تهران'],
    ['دنبال آپارتمان در سباری تهران هستم', 'تهران'],
    ['آپارتمان در نیاوران تهران میخواهم', 'تهران'],
    ['آپارتمان ۱۲۰ متری در موحد دانش تهران', 'تهران'],
    ['آپارتمان در ونک تهران میخوام', 'تهران'],
    ['آپارتمان در فرمانیه تهران دنبال میگردم', 'تهران'],
  ];
  for (const [text, city] of cases) {
    const r = resolveTextNeighborhoodInCity(hoods, text, city);
    console.log(
      `- ${text.slice(0, 40)}… →`,
      r.hit ? `HIT ${r.hit.name}` : r.candidates.length ? `CANDIDATES: ${r.candidates.slice(0,4).map(c=>c.name).join(' | ')}` : 'none'
    );
  }
}
main();
