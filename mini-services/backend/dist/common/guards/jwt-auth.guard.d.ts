import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
export declare const ROLES_KEY = "roles";
export declare class JwtAuthGuard implements CanActivate {
    private jwtService;
    private prisma;
    private reflector;
    constructor(jwtService: JwtService, prisma: PrismaService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
