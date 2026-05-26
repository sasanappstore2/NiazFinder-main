import { NextRequest, NextResponse } from 'next/server';
import {
  makeUniqueLocationId,
  readManagedLocationData,
  writeManagedLocationData,
  getLocationStats,
  enrichWithCatalogNeighborhoods,
  type ManagedLocationData,
  type ManagedProvince,
  type ManagedCity,
  type ManagedNeighborhood,
} from '@/lib/admin-locations';
import {
  loadCityNeighborhoods,
  saveCityCatalog,
  managedToCatalogNeighborhood,
  rebuildManifestFromCatalog,
  listCatalogCityIds,
} from '@/lib/neighborhoods/catalog';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';

export const runtime = 'nodejs';

type LocationType = 'province' | 'city' | 'neighborhood';

interface LocationPayload {
  type?: LocationType;
  id?: string;
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  name?: string;
  nameEn?: string;
  isActive?: boolean;
  isPopular?: boolean;
  isIsland?: boolean;
  order?: number;
  areas?: string[];
}

function cloneData(data: ManagedLocationData): ManagedLocationData {
  return JSON.parse(JSON.stringify(data)) as ManagedLocationData;
}

function findProvince(data: ManagedLocationData, provinceId?: string) {
  if (!provinceId) return null;
  for (const country of data.countries) {
    const province = country.provinces.find((item) => item.id === provinceId);
    if (province) return province;
  }
  return null;
}

function findCity(data: ManagedLocationData, cityId?: string) {
  if (!cityId) return null;
  for (const country of data.countries) {
    for (const province of country.provinces) {
      const city = province.cities.find((item) => item.id === cityId);
      if (city) return city;
    }
  }
  return null;
}

async function findNeighborhoodCityId(
  neighborhoodId: string
): Promise<{ cityId: string; neighborhoods: ManagedNeighborhood[] } | null> {
  const cityIds = await listCatalogCityIds();
  for (const cityId of cityIds) {
    const neighborhoods = await loadCityNeighborhoods(cityId);
    if (neighborhoods.some((n) => n.id === neighborhoodId)) {
      return { cityId, neighborhoods };
    }
  }
  return null;
}

async function persistCityNeighborhoods(
  cityId: string,
  cityName: string,
  neighborhoods: ManagedNeighborhood[],
  source: 'divar' | 'manual' = 'manual'
) {
  await saveCityCatalog(cityId, {
    cityName,
    source,
    neighborhoods: neighborhoods.map(managedToCatalogNeighborhood),
  });
  await rebuildManifestFromCatalog();
}

function applyCommonFields(
  item: ManagedProvince | ManagedCity | ManagedNeighborhood,
  body: LocationPayload
) {
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) throw new Error('نام نمی‌تواند خالی باشد');
    item.name = name;
  }
  if (body.nameEn !== undefined) item.nameEn = body.nameEn.trim();
  if (typeof body.isActive === 'boolean') item.isActive = body.isActive;
  if (body.order !== undefined) item.order = Number(body.order) || 0;
  if (body.areas !== undefined && 'areas' in item) {
    const neighborhood = item as ManagedNeighborhood;
    neighborhood.areas = body.areas
      .map((a) => a.trim())
      .filter(Boolean);
    if (neighborhood.areas.length === 0) delete neighborhood.areas;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'geo:locations:read');
    if (!authz.ok) return authz.response;

    const data = await enrichWithCatalogNeighborhoods(await readManagedLocationData());
    return NextResponse.json({
      ...data,
      stats: await getLocationStats(data),
    });
  } catch (error) {
    console.error('Super admin locations GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'geo:locations:write');
    if (!authz.ok) return authz.response;

    const body: LocationPayload = await request.json();
    const name = body.name?.trim();

    if (!body.type || !['province', 'city', 'neighborhood'].includes(body.type)) {
      return NextResponse.json({ error: 'نوع موقعیت معتبر نیست' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'نام الزامی است' }, { status: 400 });
    }

    const data = cloneData(await readManagedLocationData());
    const id = makeUniqueLocationId(name, data);

    if (body.type === 'province') {
      const country = data.countries.find((item) => item.id === (body.countryId || 'iran'));
      if (!country) {
        return NextResponse.json({ error: 'کشور یافت نشد' }, { status: 404 });
      }

      country.provinces.push({
        id,
        name,
        nameEn: body.nameEn?.trim() || id,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
        order: body.order ?? country.provinces.length + 1,
        cities: [],
      });
    }

    if (body.type === 'city') {
      const province = findProvince(data, body.provinceId);
      if (!province) {
        return NextResponse.json({ error: 'استان یافت نشد' }, { status: 404 });
      }

      province.cities.push({
        id,
        name,
        nameEn: body.nameEn?.trim() || id,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
        isPopular: Boolean(body.isPopular),
        isIsland: Boolean(body.isIsland),
        order: body.order ?? province.cities.length + 1,
        neighborhoods: [],
      });
    }

    if (body.type === 'neighborhood') {
      const city = findCity(data, body.cityId);
      if (!city) {
        return NextResponse.json({ error: 'شهر یافت نشد' }, { status: 404 });
      }

      const areas = body.areas?.map((a) => a.trim()).filter(Boolean);
      const existing = await loadCityNeighborhoods(city.id);
      const entry: ManagedNeighborhood = {
        id,
        name,
        nameEn: body.nameEn?.trim() || id,
        ...(areas?.length ? { areas } : {}),
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
        order: body.order ?? existing.length + 1,
      };
      await persistCityNeighborhoods(city.id, city.name, [...existing, entry]);
    }

    const nextData = await enrichWithCatalogNeighborhoods(
      await writeManagedLocationData(data)
    );

    await logAdminAction(request, authz.user.id, 'geo.location.create', 'ManagedLocation', id, {
      type: body.type,
      name,
      parent: { countryId: body.countryId, provinceId: body.provinceId, cityId: body.cityId },
    });

    return NextResponse.json(
      { ...nextData, stats: await getLocationStats(nextData) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Super admin locations POST error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'geo:locations:write');
    if (!authz.ok) return authz.response;

    const body: LocationPayload = await request.json();
    if (!body.type || !body.id) {
      return NextResponse.json({ error: 'نوع و شناسه الزامی است' }, { status: 400 });
    }

    const data = cloneData(await readManagedLocationData());
    let item: ManagedProvince | ManagedCity | ManagedNeighborhood | null = null;

    if (body.type === 'province') item = findProvince(data, body.id);
    if (body.type === 'city') item = findCity(data, body.id);
    let neighborhoodCity: { cityId: string; cityName: string } | null = null;

    if (body.type === 'neighborhood') {
      const found = await findNeighborhoodCityId(body.id);
      if (found) {
        item = found.neighborhoods.find((n) => n.id === body.id) ?? null;
        const city = findCity(data, found.cityId);
        if (city) neighborhoodCity = { cityId: found.cityId, cityName: city.name };
      }
    }

    if (!item) {
      return NextResponse.json({ error: 'موقعیت یافت نشد' }, { status: 404 });
    }

    applyCommonFields(item, body);
    if (body.type === 'city') {
      const city = item as ManagedCity;
      if (typeof body.isPopular === 'boolean') city.isPopular = body.isPopular;
      if (typeof body.isIsland === 'boolean') city.isIsland = body.isIsland;
    }

    if (body.type === 'neighborhood' && neighborhoodCity) {
      const list = await loadCityNeighborhoods(neighborhoodCity.cityId);
      await persistCityNeighborhoods(
        neighborhoodCity.cityId,
        neighborhoodCity.cityName,
        list
      );
    }

    const nextData = await enrichWithCatalogNeighborhoods(await writeManagedLocationData(data));

    await logAdminAction(request, authz.user.id, 'geo.location.update', 'ManagedLocation', body.id, {
      type: body.type,
      updates: body,
    });

    return NextResponse.json({ ...nextData, stats: await getLocationStats(nextData) });
  } catch (error) {
    console.error('Super admin locations PATCH error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'geo:locations:write');
    if (!authz.ok) return authz.response;

    const body: LocationPayload = await request.json();
    if (!body.type || !body.id) {
      return NextResponse.json({ error: 'نوع و شناسه الزامی است' }, { status: 400 });
    }

    const data = cloneData(await readManagedLocationData());

    if (body.type === 'province') {
      for (const country of data.countries) {
        country.provinces = country.provinces.filter((province) => province.id !== body.id);
      }
    }

    if (body.type === 'city') {
      for (const country of data.countries) {
        for (const province of country.provinces) {
          province.cities = province.cities.filter((city) => city.id !== body.id);
        }
      }
    }

    if (body.type === 'neighborhood') {
      const found = await findNeighborhoodCityId(body.id);
      if (found) {
        const city = findCity(data, found.cityId);
        const nextList = found.neighborhoods.filter((n) => n.id !== body.id);
        await persistCityNeighborhoods(
          found.cityId,
          city?.name ?? found.cityId,
          nextList
        );
      }
    }

    const nextData = await enrichWithCatalogNeighborhoods(await writeManagedLocationData(data));

    await logAdminAction(request, authz.user.id, 'geo.location.delete', 'ManagedLocation', body.id, {
      type: body.type,
    });

    return NextResponse.json({ ...nextData, stats: await getLocationStats(nextData) });
  } catch (error) {
    console.error('Super admin locations DELETE error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
