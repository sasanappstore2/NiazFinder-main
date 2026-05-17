"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DatabaseModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dataSourceProvider = {
    provide: 'DATA_SOURCE',
    useFactory: () => {
        try {
            return new typeorm_2.DataSource({});
        }
        catch {
            return null;
        }
    },
    inject: [],
};
let DatabaseModule = DatabaseModule_1 = class DatabaseModule {
    static forRoot(entities) {
        const logger = new common_1.Logger('Database');
        return {
            module: DatabaseModule_1,
            imports: [
                typeorm_1.TypeOrmModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: async (config) => {
                        const host = config.get('DATABASE_HOST') || 'localhost';
                        const port = config.get('DATABASE_PORT') || 5432;
                        const dbName = config.get('DATABASE_NAME') || 'needfinder';
                        const username = config.get('DATABASE_USER') || 'needfinder';
                        const password = config.get('DATABASE_PASSWORD') || 'needfinder123';
                        logger.log(`Attempting PostgreSQL connection: ${host}:${port}/${dbName}`);
                        const net = await Promise.resolve().then(() => require('net'));
                        const isReachable = await new Promise((resolve) => {
                            const socket = new net.Socket();
                            const timeout = setTimeout(() => {
                                socket.destroy();
                                resolve(false);
                            }, 3000);
                            socket.connect(port, host, () => {
                                clearTimeout(timeout);
                                socket.destroy();
                                resolve(true);
                            });
                            socket.on('error', () => {
                                clearTimeout(timeout);
                                socket.destroy();
                                resolve(false);
                            });
                        });
                        if (!isReachable) {
                            logger.warn(`⚠️ PostgreSQL at ${host}:${port} is NOT reachable.`);
                            logger.warn(`⚠️ TypeORM features will be limited. Using Prisma/SQLite as fallback.`);
                            return {
                                type: 'sqlite',
                                database: config.get('SQLITE_PATH') || './data/needfinder.db',
                                entities,
                                synchronize: false,
                                logging: false,
                            };
                        }
                        logger.log(`✅ PostgreSQL is reachable. Configuring TypeORM...`);
                        return {
                            type: 'postgres',
                            host,
                            port,
                            username,
                            password,
                            database: dbName,
                            entities,
                            synchronize: config.get('NODE_ENV') === 'development',
                            logging: false,
                            ssl: config.get('NODE_ENV') === 'production'
                                ? { rejectUnauthorized: false }
                                : false,
                        };
                    },
                }),
            ],
            providers: [dataSourceProvider],
            exports: [typeorm_1.TypeOrmModule, 'DATA_SOURCE'],
        };
    }
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = DatabaseModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], DatabaseModule);
//# sourceMappingURL=database.module.js.map