import { createHash } from 'crypto';

export function hashIp(ip: string): string {
  const salt = process.env.ANALYTICS_IP_SALT ?? 'needfinder-analytics';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1';
}
