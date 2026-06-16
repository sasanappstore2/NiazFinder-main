/**
 * Import intake location catalog from JSON into Prisma (IntakeProvince/City/Neighborhood/Alias).
 * Run: npx tsx scripts/migrate/neighborhoods-json-to-prisma.ts
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_PATH = path.join(process.cwd(), 'src/data/admin-locations.json');
const CATALOG_DIR = path.join(process.cwd(), 'src/data/neighborhoods/catalog');
const MANIFEST_PATH = path.join(process.cwd(), 'src/data/neighborhoods/manifest.json');

const SEED_ALIASES: Array<{ alias: string; citySlug: string; neighborhoodSlug: string }> = [
  {
    alias: '\u0646\u06CC\u0627\u0648\u0631\u0648\u0646',
    citySlug: 'tehran-city',
    neighborhoodSlug: '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646',
  },
  {
    alias: '\u0646\u06CC\u0648\u0627\u0631\u0627\u0646',
    citySlug: 'tehran-city',
    neighborhoodSlug: '\u0646\u06CC\u0627\u0648\u0631\u0627\u0646',
  },
  {
    alias: '\u0634\u0647\u0631\u06A9 \u063A\u0631\u0628',
    citySlug: 'mashhad',
    neighborhoodSlug: '\u0634\u0647\u0631\u06A9-\u063A\u0631\u0628-\u0645\u0634\u0647\u062F',
  },
  {
    alias: '\u0634\u0647\u0631\u06A9\u063A\u0631\u0628',
    citySlug: 'mashhad',
    neighborhoodSlug: '\u0634\u0647\u0631\u06A9-\u063A\u0631\u0628-\u0645\u0634\u0647\u062F',
  },
];

function normalizeAlias(s: string): string {
  return s.trim().replace(/\u200c/g, ' ').replace(/\s+/g, ' ');
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
  let aliasCount = 0;

  for (const country of admin.countries) {
    for (const prov of country.provinces) {
      const province = await prisma.intakeProvince.upsert({
        where: { slug: prov.id },
        create: {
          slug: prov.id,
          name: prov.name,
          nameEn: prov.nameEn ?? null,
        },
        update: { name: prov.name, nameEn: prov.nameEn ?? null },
      });
      provinceCount += 1;

      for (const c of prov.cities) {
        const city = await prisma.intakeCity.upsert({
          where: { slug: c.id },
          create: {
            slug: c.id,
            name: c.name,
            nameEn: c.nameEn ?? null,
            provinceId: province.id,
          },
          update: {
            name: c.name,
            nameEn: c.nameEn ?? null,
            provinceId: province.id,
          },
        });
        cityCount += 1;

        const catalogPath = path.join(CATALOG_DIR, `${c.id}.json`);
        try {
          const catRaw = await fs.readFile(catalogPath, 'utf8');
          const cat = JSON.parse(catRaw) as {
            neighborhoods?: Array<{
              id: string;
              name: string;
              nameEn?: string;
              areas?: string[];
              centroid?: { lat: number; lng: number };
              bbox?: Record<string, number>;
            }>;
          };

          for (const n of cat.neighborhoods ?? []) {
            const hood = await prisma.intakeNeighborhood.upsert({
              where: { cityId_slug: { cityId: city.id, slug: n.id } },
              create: {
                slug: n.id,
                name: n.name,
                nameEn: n.nameEn ?? null,
                cityId: city.id,
                areas: n.areas ?? [],
                lat: n.centroid?.lat ?? null,
                lng: n.centroid?.lng ?? null,
                bbox: n.bbox ?? undefined,
              },
              update: {
                name: n.name,
                nameEn: n.nameEn ?? null,
                areas: n.areas ?? [],
                lat: n.centroid?.lat ?? null,
                lng: n.centroid?.lng ?? null,
                bbox: n.bbox ?? undefined,
              },
            });
            hoodCount += 1;

            const nameAlias = normalizeAlias(n.name);
            if (nameAlias) {
              await prisma.intakeLocationAlias.upsert({
                where: { id: createHash('sha256').update(`hood:${hood.id}:${nameAlias}`).digest('hex').slice(0, 24) },
                create: {
                  id: createHash('sha256').update(`hood:${hood.id}:${nameAlias}`).digest('hex').slice(0, 24),
                  alias: nameAlias,
                  aliasRaw: n.name,
                  neighborhoodId: hood.id,
                  source: 'import',
                },
                update: { alias: nameAlias, neighborhoodId: hood.id },
              }).catch(() => {
                /* duplicate alias ok */
              });
            }
          }
        } catch {
          /* no catalog file for city */
        }
      }
    }
  }

  for (const seed of SEED_ALIASES) {
    const city = await prisma.intakeCity.findUnique({ where: { slug: seed.citySlug } });
    if (!city) continue;
    const hood = await prisma.intakeNeighborhood.findUnique({
      where: { cityId_slug: { cityId: city.id, slug: seed.neighborhoodSlug } },
    });
    if (!hood) continue;
    const alias = normalizeAlias(seed.alias);
    const id = createHash('sha256').update(`seed:${hood.id}:${alias}`).digest('hex').slice(0, 24);
    await prisma.intakeLocationAlias.upsert({
      where: { id },
      create: {
        id,
        alias,
        aliasRaw: seed.alias,
        neighborhoodId: hood.id,
        source: 'seed',
      },
      update: { alias, neighborhoodId: hood.id },
    });
    aliasCount += 1;
  }

  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as { totalNeighborhoods?: number };
  console.log(
    `Import done: ${provinceCount} provinces, ${cityCount} cities, ${hoodCount} neighborhoods, ${aliasCount} seed aliases (manifest total ~${manifest.totalNeighborhoods ?? '?'})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
