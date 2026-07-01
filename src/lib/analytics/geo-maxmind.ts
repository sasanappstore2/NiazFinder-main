import fs from 'fs';
import path from 'path';
import { Reader, ReaderModel } from '@maxmind/geoip2-node';

let readerPromise: Promise<ReaderModel | null> | null = null;

function dbPath(): string | null {
  const configured = process.env.MAXMIND_DB_PATH;
  if (configured && fs.existsSync(configured)) return configured;
  const defaultPath = path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');
  if (fs.existsSync(defaultPath)) return defaultPath;
  return null;
}

async function getReader(): Promise<ReaderModel | null> {
  if (!readerPromise) {
    readerPromise = (async () => {
      const p = dbPath();
      if (!p) return null;
      try {
        const dbBuffer = fs.readFileSync(p);
        return Reader.openBuffer(dbBuffer);
      } catch (e) {
        console.warn('[analytics] MaxMind DB unavailable:', e);
        return null;
      }
    })();
  }
  return readerPromise;
}

export type MaxMindGeo = {
  country: string;
  province: string | null;
  city: string | null;
};

export async function lookupIpGeo(ip: string): Promise<MaxMindGeo | null> {
  if (!ip || ip === '127.0.0.1' || ip.startsWith('::')) return null;
  const reader = await getReader();
  if (!reader) return null;
  try {
    const res = reader.city(ip);
    const country = res.country?.isoCode ?? 'IR';
    const province =
      res.subdivisions?.[0]?.names?.en ??
      res.subdivisions?.[0]?.isoCode ??
      null;
    const city = res.city?.names?.en ?? null;
    return { country, province, city };
  } catch {
    return null;
  }
}
