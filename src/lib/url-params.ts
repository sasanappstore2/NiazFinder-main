import type { City, Country } from './location-system';

export interface LocationParams {
  country?: string;
  province?: string;
  cities?: string;
  map_interaction?: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  price_min?: string;
  price_max?: string;
  sort?: string;
  page?: string;
}

export const generateLocationPath = (params: LocationParams): string => {
  const { country, province, cities, map_interaction } = params;

  let path = '/s';

  if (province) {
    path += `/${province}`;
  } else if (country) {
    path += `/${country}`;
  } else {
    path += '/iran';
  }

  const queryParams = new URLSearchParams();

  if (cities) {
    queryParams.set('cities', cities);
  }

  if (map_interaction) {
    queryParams.set('map_interaction', map_interaction);
  }

  const queryString = queryParams.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const parseLocationParams = (searchParams: URLSearchParams): LocationParams => {
  return {
    country: searchParams.get('country') || undefined,
    province: searchParams.get('province') || undefined,
    cities: searchParams.get('cities') || undefined,
    map_interaction: searchParams.get('map_interaction') || undefined,
  };
};

export const citiesToUrlParam = (cities: City[]): string => {
  if (cities.length === 0) return '';
  return cities.map(city => city.id).join(',');
};

export const urlParamToCities = (citiesParam: string, countriesData: Country[]): City[] => {
  if (!citiesParam) return [];

  const cityIds = citiesParam.split(',');
  const cities: City[] = [];

  for (const country of countriesData) {
    for (const province of country.provinces) {
      for (const city of province.cities) {
        if (cityIds.includes(city.id)) {
          cities.push(city);
        }
      }
    }
  }

  return cities;
};
