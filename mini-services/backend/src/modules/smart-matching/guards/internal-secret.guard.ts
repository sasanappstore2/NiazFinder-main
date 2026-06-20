import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const secret = req.headers['x-internal-secret'];
    const expected = process.env.SMART_MATCHING_INTERNAL_SECRET ?? 'smart-matching-internal-dev';
    if (secret !== expected) throw new UnauthorizedException();
    return true;
  }
}
