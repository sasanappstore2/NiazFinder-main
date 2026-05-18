import { promises as fs } from 'fs';
import path from 'path';
import { countries as defaultCountries } from '@/lib/location-system';

export interface ManagedNeighborhood {
  id: string;
  name: string;
  nameEn?: string;
  isActive: boolean;
  order: number;
}

export interface ManagedCity {
  id: string;
  name: string;
  nameEn: string;
  isIsland?: boolean;
  isPopular?: boolean;
  isActive: boolean;
  order: number;
  neighborhoods: ManagedNeighborhood[];
}

export interface ManagedProvince {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  order: number;
  cities: ManagedCity[];
}

export interface ManagedCountry {
  id: string;
  name: string;
  nameEn: string;
  isActive: boolean;
  provinces: ManagedProvince[];
}

export interface ManagedLocationData {
  countries: ManagedCountry[];
  updatedAt: string;
}

const locationFilePath = path.join(process.cwd(), 'src', 'data', 'admin-locations.json');

export function makeLocationId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || `loc-${Date.now()}`;
}

function uniqueId(base: string, existingIds: Set<string>): string {
  let candidate = base;
  let counter = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function collectIds(data: ManagedLocationData): Set<string> {
  const ids = new Set<string>();
  for (const country of data.countries) {
    ids.add(country.id);
    for (const province of country.provinces) {
      ids.add(province.id);
      for (const city of province.cities) {
        ids.add(city.id);
        for (const neighborhood of city.neighborhoods) {
          ids.add(neighborhood.id);
        }
      }
    }
  }
  return ids;
}

export function makeUniqueLocationId(value: string, data: ManagedLocationData): string {
  return uniqueId(makeLocationId(value), collectIds(data));
}

export function createDefaultManagedLocations(): ManagedLocationData {
  return {
    countries: defaultCountries.map((country) => ({
      id: country.id,
      name: country.name,
      nameEn: country.nameEn,
      isActive: true,
      provinces: country.provinces.map((province, provinceIndex) => ({
        id: province.id,
        name: province.name,
        nameEn: province.nameEn,
        isActive: true,
        order: provinceIndex + 1,
        cities: province.cities.map((city, cityIndex) => ({
          ...city,
          isActive: true,
          order: cityIndex + 1,
          neighborhoods: [],
        })),
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export async function readManagedLocationData(): Promise<ManagedLocationData> {
  try {
    const raw = await fs.readFile(locationFilePath, 'utf8');
    return JSON.parse(raw) as ManagedLocationData;
  } catch {
    return createDefaultManagedLocations();
  }
}

export async function writeManagedLocationData(data: ManagedLocationData): Promise<ManagedLocationData> {
  const nextData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(locationFilePath), { recursive: true });
  await fs.writeFile(locationFilePath, JSON.stringify(nextData, null, 2), 'utf8');
  return nextData;
}

export function getLocationStats(data: ManagedLocationData) {
  const provinces = data.countries.flatMap((country) => country.provinces);
  const cities = provinces.flatMap((province) => province.cities);
  const neighborhoods = cities.flatMap((city) => city.neighborhoods);

  return {
    countries: data.countries.length,
    provinces: provinces.length,
    activeProvinces: provinces.filter((province) => province.isActive).length,
    cities: cities.length,
    activeCities: cities.filter((city) => city.isActive).length,
    neighborhoods: neighborhoods.length,
    activeNeighborhoods: neighborhoods.filter((neighborhood) => neighborhood.isActive).length,
  };
}

export function getPublicLocationData(data: ManagedLocationData): ManagedLocationData {
  return {
    ...data,
    countries: data.countries
      .filter((country) => country.isActive)
      .map((country) => ({
        ...country,
        provinces: country.provinces
          .filter((province) => province.isActive)
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'))
          .map((province) => ({
            ...province,
            cities: province.cities
              .filter((city) => city.isActive)
              .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'))
              .map((city) => ({
                ...city,
                neighborhoods: city.neighborhoods
                  .filter((neighborhood) => neighborhood.isActive)
                  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa')),
              })),
          })),
      })),
  };
}
