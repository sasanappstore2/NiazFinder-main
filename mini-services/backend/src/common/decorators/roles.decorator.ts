import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/jwt-auth.guard';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
