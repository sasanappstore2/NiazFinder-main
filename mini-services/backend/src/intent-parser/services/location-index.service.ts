import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { scoreLocationName } from '../utils/text-similarity';
import { LocationMatch } from '../types/intent.types';
import { PersianNormalizerService } from './persian-normalizer.service';

interface AdminCity {
  id: string;
  name: string;
}

interface AdminProvince {
  id: string;
  name: string;
  cities: AdminCity[];
}

interface AdminLocationsFile {
  countries: Array<{
    provinces: AdminProvince[];
  }>;
}

interface CatalogNeighborhood {
  id: string;
  name: string;
  areas?: string[];
}

interface CatalogFile {
  cityId: string;
  cityName: string;
  neighborhoods: CatalogNeighborhood[];
}

interface IndexedNeighborhood {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  provinceId: string;
  provinceName: string;
}

@Injectable()
export class LocationIndexService implements OnModuleInit {
  private readonly logger = new Logger(LocationIndexService.name);
  private provinces: LocationMatch[] = [];
  private cities: Array<LocationMatch & { provinceId: string }> = [];
  private neighborhoods: IndexedNeighborhood[] = [];
  private cityToProvince = new Map<string, { provinceId: string; provinceName: string; cityName: string }>();
  private ready = false;

  constructor(private normalizer: PersianNormalizerService) {}

  async onModuleInit() {
    await this.load();
  }

  isReady(): boolean {
    return this.ready;
  }

  searchProvinces(text: string, limit = 3): LocationMatch[] {
    return this.rank(this.provinces, text, 0.4, limit);
  }

  searchCities(text: string, limit = 5): LocationMatch[] {
    const ranked = this.cities
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: 'city' as const,
        parentId: c.provinceId,
        confidence: scoreLocationName(text, c.name),
      }))
      .filter((c) => c.confidence > 0.4)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
    return ranked;
  }

  searchNeighborhoods(text: string, cityId?: string, limit = 5): LocationMatch[] {
    const cityNames = new Set(this.cities.map((c) => this.normalizer.normalize(c.name)));

    const ranked = this.neighborhoods
      .filter((n) => !cityId || n.cityId === cityId)
      .map((n) => {
        let confidence = scoreLocationName(text, n.name);
        const normalizedName = this.normalizer.normalize(n.name);
        if (cityNames.has(normalizedName)) {
          confidence *= 0.45;
        }
        return {
          id: n.id,
          name: n.name,
          type: 'neighborhood' as const,
          parentId: n.cityId,
          confidence,
        };
      })
      .filter((n) => n.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence || b.name.length - a.name.length)
      .slice(0, limit);
    return ranked;
  }

  resolveCity(cityId: string): { city: LocationMatch; province: LocationMatch } | null {
    const meta = this.cityToProvince.get(cityId);
    if (!meta) return null;
    return {
      city: { id: cityId, name: meta.cityName, type: 'city', confidence: 1.0 },
      province: {
        id: meta.provinceId,
        name: meta.provinceName,
        type: 'province',
        confidence: 1.0,
      },
    };
  }

  private rank(
    items: Array<{ id: string; name: string }>,
    text: string,
    threshold: number,
    limit: number,
  ): LocationMatch[] {
    return items
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: 'province' as const,
        confidence: scoreLocationName(text, item.name),
      }))
      .filter((item) => item.confidence > threshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  private async load() {
    try {
      const repoRoot = path.resolve(process.cwd(), '../..');
      const adminPath = path.join(repoRoot, 'src/data/admin-locations.json');
      const catalogDir = path.join(repoRoot, 'src/data/neighborhoods/catalog');

      if (!fs.existsSync(adminPath)) {
        this.logger.warn(`admin-locations.json not found at ${adminPath}`);
        return;
      }

      const admin = JSON.parse(fs.readFileSync(adminPath, 'utf8')) as AdminLocationsFile;
      const provinceRows: LocationMatch[] = [];
      const cityRows: Array<LocationMatch & { provinceId: string }> = [];

      for (const country of admin.countries ?? []) {
        for (const province of country.provinces ?? []) {
          provinceRows.push({
            id: province.id,
            name: province.name,
            type: 'province',
            confidence: 0,
          });
          for (const city of province.cities ?? []) {
            cityRows.push({
              id: city.id,
              name: city.name,
              type: 'city',
              provinceId: province.id,
              confidence: 0,
            });
            this.cityToProvince.set(city.id, {
              provinceId: province.id,
              provinceName: province.name,
              cityName: city.name,
            });
          }
        }
      }

      this.provinces = provinceRows;
      this.cities = cityRows;

      if (fs.existsSync(catalogDir)) {
        const files = fs.readdirSync(catalogDir).filter((f) => f.endsWith('.json'));
        for (const file of files) {
          const catalog = JSON.parse(
            fs.readFileSync(path.join(catalogDir, file), 'utf8'),
          ) as CatalogFile;
          const meta = this.cityToProvince.get(catalog.cityId);
          if (!meta) continue;

          for (const hood of catalog.neighborhoods ?? []) {
            this.neighborhoods.push({
              id: hood.id,
              name: hood.name,
              cityId: catalog.cityId,
              cityName: catalog.cityName,
              provinceId: meta.provinceId,
              provinceName: meta.provinceName,
            });
            for (const area of hood.areas ?? []) {
              if (area && area !== hood.name) {
                this.neighborhoods.push({
                  id: `${hood.id}::${area}`,
                  name: area,
                  cityId: catalog.cityId,
                  cityName: catalog.cityName,
                  provinceId: meta.provinceId,
                  provinceName: meta.provinceName,
                });
              }
            }
          }
        }
      }

      this.ready = true;
      this.logger.log(
        `Location index ready: ${this.provinces.length} provinces, ${this.cities.length} cities, ${this.neighborhoods.length} neighborhoods`,
      );
    } catch (err) {
      this.logger.warn(`Location index load failed: ${(err as Error).message}`);
    }
  }
}
