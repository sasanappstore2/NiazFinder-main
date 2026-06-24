import fs from 'fs';
import path from 'path';
import { Reader, ReaderModel } from '@maxmind/geoip2-node';

let readerPromise: Promise<ReaderModel | null> | null = null;

const DEFAULT_DB_NAME = 'GeoLite2-City.mmdb';

function defaultDbPath(): string {
  return path.join(process.cwd(), 'data', DEFAULT_DB_NAME);
}

function dbPath(): string | null {
  const defaultPath = defaultDbPath();
  const configured = process.env.MAXMIND_DB_PATH?.trim();
  if (configured) {
    if (path.isAbsolute(configured) && fs.existsSync(configured)) return configured;
    const scoped = path.join(process.cwd(), 'data', path.basename(configured));
    if (fs.existsSync(scoped)) return scoped;
  }
  if (fs.existsSync(defaultPath)) return defaultPath;
  return null;
}

async function getReader(): Promise<ReaderModel | null> {
  if (!readerPromise) {
    readerPromise = (async () => {
      const resolved = dbPath();
      if (!resolved) return null;
      try {
        const filePath =
          resolved === defaultDbPath()
            ? defaultDbPath()
            : resolved;
        const dbBuffer = fs.readFileSync(filePath);
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
