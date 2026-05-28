'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  countries as fallbackCountries,
  dedupeCitiesById,
  type City,
  type Country,
  type Province,
} from '@/lib/location-system';

interface LocationResponse {
  countries: Country[];
}

export function useManagedLocations() {
  const [countries, setCountries] = useState<Country[]>(fallbackCountries);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    fetch('/api/locations')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LocationResponse | null) => {
        if (!cancelled && data?.countries?.length) {
          setCountries(data.countries);
        }
      })
      .catch(() => {
        if (!cancelled) setCountries(fallbackCountries);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const provinces = useMemo<Province[]>(() => {
    return countries.find((country) => country.id === 'iran')?.provinces ?? [];
  }, [countries]);

  const cities = useMemo<City[]>(() => {
    return dedupeCitiesById(provinces.flatMap((province) => province.cities));
  }, [provinces]);

  const provinceNames = useMemo(() => provinces.map((province) => province.name), [provinces]);
  const cityNames = useMemo(() => cities.map((city) => city.name), [cities]);

  const searchCities = (query: string): { city: City; provinceName: string }[] => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const results: { city: City; provinceName: string }[] = [];

    for (const province of provinces) {
      const provinceMatches =
        province.name.includes(query) ||
        province.nameEn.toLowerCase().includes(normalizedQuery);

      for (const city of province.cities) {
        const cityMatches =
          city.name.includes(query) ||
          city.nameEn.toLowerCase().includes(normalizedQuery);

        if (provinceMatches || cityMatches) {
          results.push({ city, provinceName: province.name });
        }
      }
    }

    return results;
  };

  return {
    countries,
    provinces,
    cities,
    provinceNames,
    cityNames,
    isLoading,
    searchCities,
  };
}
