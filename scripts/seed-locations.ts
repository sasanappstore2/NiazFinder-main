/**
 * Idempotent import of hierarchical locations (province → city → neighborhood) into Prisma Location.
 * Run: npm run db:seed:locations
 */
import { promises as fs } from 'fs';
import path from 'path';
import { LocationType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_PATH = path.join(process.cwd(), 'src/data/admin-locations.json');
const CATALOG_DIR = path.join(process.cwd(), 'src/data/neighborhoods/catalog');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/neighborhoods/manifest.json');

type HoodRow = {
  id: string;
  name: string;
  nameEn?: string;
  areas?: string[];
  centroid?: { lat: number; lng: number };
};

async function findLocation(slug: string, type: LocationType, parentId: string | null) {
  return prisma.location.findFirst({
    where: { slug, type, parentId },
  });
}

async function upsertLocation(data: {
  slug: string;
  name: string;
  nameEn?: string | null;
  type: LocationType;
  parentId: string | null;
  semanticPath?: string | null;
  areas?: string[];
  lat?: number | null;
  lng?: number | null;
}) {
  const existing = await findLocation(data.slug, data.type, data.parentId);
  const payload = {
    slug: data.slug,
    name: data.name,
    nameEn: data.nameEn ?? null,
    type: data.type,
    parentId: data.parentId,
    semanticPath: data.semanticPath ?? null,
    areas: data.areas ?? [],
    lat: data.lat ?? null,
    lng: data.lng ?? null,
  };

  if (existing) {
    return prisma.location.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.location.create({ data: payload });
}

async function loadCatalog(cityId: string): Promise<HoodRow[]> {
  const catalogPath = path.join(CATALOG_DIR, `${cityId}.json`);
  try {
    const raw = await fs.readFile(catalogPath, 'utf8');
    const cat = JSON.parse(raw) as { neighborhoods?: HoodRow[] };
    return cat.neighborhoods ?? [];
  } catch {
    return [];
  }
}

async function main() {
  const raw = await fs.readFile(ADMIN_PATH, 'utf8');
  const admin = JSON.parse(raw) as {
    countries: Array<{
      provinces: Array<{
        id: string;
        name: string;
        nameEn?: string;
        cities: Array<{ id: string; name: string; nameEn?: string }>;
      }>;
    }>;
  };

  let provinceCount = 0;
  let cityCount = 0;
  let hoodCount = 0;

  for (const country of admin.countries) {
    for (const prov of country.provinces) {
      const province = await upsertLocation({
        slug: prov.id,
        name: prov.name,
        nameEn: prov.nameEn ?? null,
        type: LocationType.PROVINCE,
        parentId: null,
        semanticPath: `استان ${prov.name}`,
      });
      provinceCount += 1;

      for (const c of prov.cities) {
        const city = await upsertLocation({
          slug: c.id,
          name: c.name,
          nameEn: c.nameEn ?? null,
          type: LocationType.CITY,
          parentId: province.id,
          semanticPath: `استان ${prov.name}، شهر ${c.name}`,
        });
        cityCount += 1;

        const neighborhoods = await loadCatalog(c.id);
        for (const n of neighborhoods) {
          await upsertLocation({
            slug: n.id,
            name: n.name,
            nameEn: n.nameEn ?? null,
            type: LocationType.NEIGHBORHOOD,
            parentId: city.id,
            areas: n.areas ?? [],
            lat: n.centroid?.lat ?? null,
            lng: n.centroid?.lng ?? null,
            semanticPath: `استان ${prov.name}، شهر ${c.name}، محله ${n.name}`,
          });
          hoodCount += 1;
        }
      }
    }
  }

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as {
    totalNeighborhoods?: number;
  };
  console.log(
    `Location seed done: ${provinceCount} provinces, ${cityCount} cities, ${hoodCount} neighborhoods (manifest ~${manifest.totalNeighborhoods ?? '?'})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
