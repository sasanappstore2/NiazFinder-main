import { Injectable } from '@nestjs/common';
import { PersianNormalizerService } from './persian-normalizer.service';
import { LocationIndexService } from './location-index.service';
import { LocationResult } from '../types/intent.types';

@Injectable()
export class LocationExtractorService {
  constructor(
    private locationIndex: LocationIndexService,
    private normalizer: PersianNormalizerService,
  ) {}

  async extract(text: string): Promise<{ result: LocationResult; cleanedText: string }> {
    const normalized = this.normalizer.normalize(text);

    const cities = this.locationIndex.searchCities(normalized);
    const anchorCity = cities.length > 0 ? cities[0] : undefined;

    const [provinces, neighborhoods] = await Promise.all([
      Promise.resolve(this.locationIndex.searchProvinces(normalized)),
      Promise.resolve(
        this.locationIndex.searchNeighborhoods(normalized, anchorCity?.id),
      ),
    ]);

    let neighborhoodMatches = neighborhoods;
    if (neighborhoodMatches.length === 0) {
      neighborhoodMatches = this.locationIndex.searchNeighborhoods(normalized);
    }

    const result: LocationResult = { confidence: 0, extractedTokens: [] };

    if (neighborhoodMatches.length > 0) {
      result.neighborhood = neighborhoodMatches[0];
      result.extractedTokens.push(neighborhoodMatches[0].name);

      if (neighborhoodMatches[0].parentId) {
        const parent = this.locationIndex.resolveCity(neighborhoodMatches[0].parentId);
        if (parent) {
          result.city = parent.city;
          result.province = parent.province;
        }
      }
    }

    if (cities.length > 0 && !result.city) {
      result.city = cities[0];
      result.extractedTokens.push(cities[0].name);

      if (cities[0].parentId && !result.province) {
        const parent = this.locationIndex.resolveCity(cities[0].id);
        if (parent) result.province = parent.province;
      }
    }

    if (provinces.length > 0 && !result.province) {
      result.province = provinces[0];
      result.extractedTokens.push(provinces[0].name);
    }

    const matchCount = [result.province, result.city, result.neighborhood].filter(Boolean).length;
    result.confidence = matchCount > 0 ? Math.min(0.5 + matchCount * 0.2, 1.0) : 0;

    const cleanedText = this.normalizer.removeTokens(normalized, result.extractedTokens);
    return { result, cleanedText };
  }
}
