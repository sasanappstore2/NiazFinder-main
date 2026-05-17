import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const dataSourceProvider: Provider = {
  provide: 'DATA_SOURCE',
  useFactory: () => {
    try {
      return new DataSource({
        type: 'sqlite',
        database: ':memory:',
      });
    } catch {
      return null;
    }
  },
  inject: [],
};

/**
 * Database module that gracefully handles PostgreSQL unavailability.
 * When PostgreSQL is not available, TypeORM features are limited
 * but the application continues to run with Prisma/SQLite fallback.
 */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(entities: Function[]): DynamicModule {
    const logger = new Logger('Database');

    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: async (config: ConfigService) => {
            const host = config.get<string>('DATABASE_HOST') || 'localhost';
            const port = config.get<number>('DATABASE_PORT') || 5432;
            const dbName = config.get<string>('DATABASE_NAME') || 'needfinder';
            const username = config.get<string>('DATABASE_USER') || 'needfinder';
            const password = config.get<string>('DATABASE_PASSWORD') || 'needfinder123';

            logger.log(`Attempting PostgreSQL connection: ${host}:${port}/${dbName}`);

            // Test if PostgreSQL is reachable before configuring TypeORM
            const net = await import('net');
            const isReachable = await new Promise<boolean>((resolve) => {
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
              logger.warn(
                `⚠️ PostgreSQL at ${host}:${port} is NOT reachable.`,
              );
              logger.warn(
                `⚠️ TypeORM features will be limited. Using Prisma/SQLite as fallback.`,
              );

              // Return a config that won't crash - use sqlite as fallback type
              return {
                type: 'sqlite' as const,
                database: config.get<string>('SQLITE_PATH') || './data/needfinder.db',
                entities,
                synchronize: false,
                logging: false,
              };
            }

            logger.log(`✅ PostgreSQL is reachable. Configuring TypeORM...`);

            return {
              type: 'postgres' as const,
              host,
              port,
              username,
              password,
              database: dbName,
              entities,
              synchronize: config.get('NODE_ENV') === 'development',
              logging: false,
              ssl:
                config.get('NODE_ENV') === 'production'
                  ? { rejectUnauthorized: false }
                  : false,
            };
          },
        }),
      ],
      providers: [dataSourceProvider],
      exports: [TypeOrmModule, 'DATA_SOURCE'],
    };
  }
}
