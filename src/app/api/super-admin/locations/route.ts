import { NextRequest, NextResponse } from 'next/server';
import {
  makeUniqueLocationId,
  readManagedLocationData,
  writeManagedLocationData,
  getLocationStats,
  type ManagedLocationData,
  type ManagedProvince,
  type ManagedCity,
  type ManagedNeighborhood,
} from '@/lib/admin-locations';
import { getAuthUser } from '@/lib/auth';
import { isAllowedSuperAdmin } from '@/lib/super-admin';

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
}

async function requireSuperAdmin(request: NextRequest) {
  const authUser = await getAuthUser(request);
  return isAllowedSuperAdmin(authUser);
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
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

    const data = await readManagedLocationData();
    return NextResponse.json({
      ...data,
      stats: getLocationStats(data),
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
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

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

      city.neighborhoods.push({
        id,
        name,
        nameEn: body.nameEn?.trim() || id,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
        order: body.order ?? city.neighborhoods.length + 1,
      });
    }

    const nextData = await writeManagedLocationData(data);
    return NextResponse.json({ ...nextData, stats: getLocationStats(nextData) }, { status: 201 });
  } catch (error) {
    console.error('Super admin locations POST error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

    const body: LocationPayload = await request.json();
    if (!body.type || !body.id) {
      return NextResponse.json({ error: 'نوع و شناسه الزامی است' }, { status: 400 });
    }

    const data = cloneData(await readManagedLocationData());
    let item: ManagedProvince | ManagedCity | ManagedNeighborhood | null = null;

    if (body.type === 'province') item = findProvince(data, body.id);
    if (body.type === 'city') item = findCity(data, body.id);
    if (body.type === 'neighborhood') {
      for (const country of data.countries) {
        for (const province of country.provinces) {
          for (const city of province.cities) {
            item = city.neighborhoods.find((neighborhood) => neighborhood.id === body.id) || null;
            if (item) break;
          }
          if (item) break;
        }
        if (item) break;
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

    const nextData = await writeManagedLocationData(data);
    return NextResponse.json({ ...nextData, stats: getLocationStats(nextData) });
  } catch (error) {
    console.error('Super admin locations PATCH error:', error);
    const message = error instanceof Error ? error.message : 'خطای سرور رخ داده است';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json(
        { error: 'این بخش فقط برای سوپرادمین اصلی فعال است' },
        { status: 403 }
      );
    }

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
      for (const country of data.countries) {
        for (const province of country.provinces) {
          for (const city of province.cities) {
            city.neighborhoods = city.neighborhoods.filter(
              (neighborhood) => neighborhood.id !== body.id
            );
          }
        }
      }
    }

    const nextData = await writeManagedLocationData(data);
    return NextResponse.json({ ...nextData, stats: getLocationStats(nextData) });
  } catch (error) {
    console.error('Super admin locations DELETE error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
