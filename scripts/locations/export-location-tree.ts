/**
 * Export a single hierarchical JSON: country → province → city → neighborhood.
 *
 * Run:
 *   npm run locations:export-tree
 *   npm run locations:export-tree -- --out=reports/my-tree.json
 */
import { promises as fs } from 'fs';
import path from 'path';
import { readManagedLocationData } from '../../src/lib/admin-locations';
import {
  loadCityCatalogFile,
  resolveCatalogCityIdCandidates,
} from '../../src/lib/neighborhoods/catalog';
import { displayAreaLabels } from '../../src/lib/neighborhoods/area-labels';
import type { CatalogNeighborhood } from '../../src/lib/neighborhoods/catalog-types';
import { REPORTS_DIR } from '../neighborhoods/lib';

const DEFAULT_OUT = path.join(process.cwd(), 'src/data/iran-locations-tree.json');

interface TreeNeighborhood {
  id: string;
  name: string;
  nameEn: string;
  areas?: string[];
}

interface TreeCity {
  id: string;
  name: string;
  nameEn: string;
  isPopular?: boolean;
  neighborhoodCount: number;
  neighborhoods: TreeNeighborhood[];
}

interface TreeProvince {
  id: string;
  name: string;
  nameEn: string;
  order: number;
  cityCount: number;
  neighborhoodCount: number;
  cities: TreeCity[];
}

interface TreeCountry {
  id: string;
  name: string;
  nameEn: string;
  provinceCount: number;
  cityCount: number;
  neighborhoodCount: number;
  provinces: TreeProvince[];
}

interface LocationTreeDocument {
  version: 1;
  generatedAt: string;
  summary: {
    provinces: number;
    cities: number;
    neighborhoods: number;
  };
  countries: TreeCountry[];
}

function parseOutArg(argv: string[]): string {
  for (const arg of argv) {
    if (arg.startsWith('--out=')) return path.resolve(arg.slice('--out='.length));
  }
  return DEFAULT_OUT;
}

async function loadCatalogNeighborhoods(cityId: string): Promise<CatalogNeighborhood[]> {
  for (const candidate of resolveCatalogCityIdCandidates(cityId)) {
    const file = await loadCityCatalogFile(candidate);
    if (file?.neighborhoods?.length) return file.neighborhoods;
  }
  return [];
}

function toTreeNeighborhood(n: CatalogNeighborhood): TreeNeighborhood {
  const areas = displayAreaLabels(n.areas, n.name);
  return {
    id: n.id,
    name: n.name,
    nameEn: n.nameEn ?? n.id,
    ...(areas.length ? { areas } : {}),
  };
}

async function main(): Promise<void> {
  const outPath = parseOutArg(process.argv.slice(2));
  const admin = await readManagedLocationData();

  let totalCities = 0;
  let totalNeighborhoods = 0;

  const countries: TreeCountry[] = [];

  for (const country of admin.countries) {
    const provinces: TreeProvince[] = [];
    let countryCities = 0;
    let countryNeighborhoods = 0;

    for (const province of country.provinces) {
      const cities: TreeCity[] = [];
      let provinceNeighborhoods = 0;

      for (const city of province.cities) {
        const hoods = await loadCatalogNeighborhoods(city.id);
        const neighborhoods = hoods
          .map(toTreeNeighborhood)
          .sort((a, b) => a.name.localeCompare(b.name, 'fa'));

        provinceNeighborhoods += neighborhoods.length;
        cities.push({
          id: city.id,
          name: city.name,
          nameEn: city.nameEn,
          ...(city.isPopular ? { isPopular: true } : {}),
          neighborhoodCount: neighborhoods.length,
          neighborhoods,
        });
      }

      cities.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
      countryCities += cities.length;
      countryNeighborhoods += provinceNeighborhoods;
      totalCities += cities.length;
      totalNeighborhoods += provinceNeighborhoods;

      provinces.push({
        id: province.id,
        name: province.name,
        nameEn: province.nameEn,
        order: province.order,
        cityCount: cities.length,
        neighborhoodCount: provinceNeighborhoods,
        cities,
      });
    }

    provinces.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'));

    countries.push({
      id: country.id,
      name: country.name,
      nameEn: country.nameEn,
      provinceCount: provinces.length,
      cityCount: countryCities,
      neighborhoodCount: countryNeighborhoods,
      provinces,
    });
  }

  const doc: LocationTreeDocument = {
    version: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      provinces: countries.reduce((n, c) => n + c.provinceCount, 0),
      cities: totalCities,
      neighborhoods: totalNeighborhoods,
    },
    countries,
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(doc, null, 2), 'utf8');

  const sizeMb = ((await fs.stat(outPath)).size / (1024 * 1024)).toFixed(2);
  console.log(`Location tree → ${outPath}`);
  console.log('Summary:', doc.summary);
  console.log(`File size: ${sizeMb} MB`);
  console.log(`Also available copy: ${path.join(REPORTS_DIR, 'iran-locations-tree.json')}`);

  if (outPath !== path.join(REPORTS_DIR, 'iran-locations-tree.json')) {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    await fs.writeFile(
      path.join(REPORTS_DIR, 'iran-locations-tree.json'),
      JSON.stringify(doc, null, 2),
      'utf8'
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
