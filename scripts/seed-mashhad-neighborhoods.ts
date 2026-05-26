/**
 * Merge Mashhad neighborhoods into admin-locations.json
 * Run: npm run seed:mashhad-neighborhoods
 */
import {
  readManagedLocationData,
  writeManagedLocationData,
  type ManagedNeighborhood,
} from '../src/lib/admin-locations';
import { MASHHAD_NEIGHBORHOODS } from '../src/data/neighborhoods/mashhad';

const CITY_ID = 'mashhad';

async function main() {
  const data = await readManagedLocationData();
  let cityFound = false;

  for (const country of data.countries) {
    for (const province of country.provinces) {
      const city = province.cities.find((c) => c.id === CITY_ID);
      if (!city) continue;
      cityFound = true;

      const existingIds = new Set(city.neighborhoods.map((n) => n.id));
      const next: ManagedNeighborhood[] = [...city.neighborhoods];

      MASHHAD_NEIGHBORHOODS.forEach((seed, index) => {
        const id = seed.id;
        existingIds.add(id);

        const existing = next.find((x) => x.id === id || x.name === seed.name);
        const entry: ManagedNeighborhood = {
          id,
          name: seed.name,
          nameEn: seed.id,
          areas: seed.areas?.length ? seed.areas : undefined,
          isActive: true,
          order: index + 1,
        };

        if (existing) {
          Object.assign(existing, entry);
        } else {
          next.push(entry);
        }
      });

      city.neighborhoods = next.sort((a, b) => a.order - b.order);
      console.log(`✓ ${city.name}: ${city.neighborhoods.length} neighborhoods`);
    }
  }

  if (!cityFound) {
    console.error(`City "${CITY_ID}" not found in admin-locations.json`);
    process.exit(1);
  }

  await writeManagedLocationData(data);
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
