export type ParsedUa = {
  device: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser: string;
  browserVersion: string | null;
  os: string;
  osVersion: string | null;
};

function extractVersion(ua: string, pattern: RegExp): string | null {
  const m = ua.match(pattern);
  return m?.[1] ?? null;
}

export function parseUserAgent(userAgent: string | null): ParsedUa {
  if (!userAgent) {
    return { device: 'unknown', browser: 'unknown', browserVersion: null, os: 'unknown', osVersion: null };
  }

  const ua = userAgent.toLowerCase();
  let device: ParsedUa['device'] = 'desktop';
  if (/ipad|tablet|playbook|silk/.test(ua)) device = 'tablet';
  else if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(ua)) device = 'mobile';

  let browser = 'other';
  let browserVersion: string | null = null;
  if (ua.includes('edg/')) {
    browser = 'Edge';
    browserVersion = extractVersion(userAgent, /Edg\/([\d.]+)/i);
  } else if (ua.includes('chrome/') && !ua.includes('chromium')) {
    browser = 'Chrome';
    browserVersion = extractVersion(userAgent, /Chrome\/([\d.]+)/i);
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
    browserVersion = extractVersion(userAgent, /Firefox\/([\d.]+)/i);
  } else if (ua.includes('safari/') && !ua.includes('chrome')) {
    browser = 'Safari';
    browserVersion = extractVersion(userAgent, /Version\/([\d.]+)/i);
  } else if (ua.includes('opr/') || ua.includes('opera')) {
    browser = 'Opera';
    browserVersion = extractVersion(userAgent, /OPR\/([\d.]+)/i);
  }

  let os = 'other';
  let osVersion: string | null = null;
  if (ua.includes('windows')) {
    os = 'Windows';
    osVersion = extractVersion(userAgent, /Windows NT ([\d.]+)/i);
  } else if (ua.includes('mac os') || ua.includes('macintosh')) {
    os = 'macOS';
    osVersion = extractVersion(userAgent, /Mac OS X ([\d_]+)/i)?.replace(/_/g, '.') ?? null;
  } else if (ua.includes('android')) {
    os = 'Android';
    osVersion = extractVersion(userAgent, /Android ([\d.]+)/i);
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) {
    os = 'iOS';
    osVersion = extractVersion(userAgent, /OS ([\d_]+)/i)?.replace(/_/g, '.') ?? null;
  } else if (ua.includes('linux')) os = 'Linux';

  return { device, browser, browserVersion, os, osVersion };
}

export function uaBrowserLabel(parsed: ParsedUa): string {
  return parsed.browserVersion ? `${parsed.browser} ${parsed.browserVersion.split('.')[0]}` : parsed.browser;
}

export function uaOsLabel(parsed: ParsedUa): string {
  return parsed.osVersion ? `${parsed.os} ${parsed.osVersion.split('.')[0]}` : parsed.os;
}
