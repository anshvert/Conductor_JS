import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisAppService } from './redis.service';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global() // Make RedisAppService available globally if needed, or import module specifically
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            useFactory: (configService: ConfigService) => {
                return new Redis({
                    host: configService.get<string>('REDIS_HOST'),
                    port: configService.get<number>('REDIS_PORT'),
                    // Add other Redis options here if needed (e.g., password)
                });
            },
            inject: [ConfigService],
        },
        RedisAppService,
    ],
    exports: [RedisAppService],
})

export class RedisAppModule {}