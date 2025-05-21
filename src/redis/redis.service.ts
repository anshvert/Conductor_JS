import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisAppService implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

    async onModuleDestroy() {
        this.redisClient.disconnect();
    }

    async set(key: string, value: any, ttlSeconds?: number): Promise<'OK'> {
        const stringValue = JSON.stringify(value);
        if (ttlSeconds) {
            return this.redisClient.set(key, stringValue, 'EX', ttlSeconds);
        }
        return this.redisClient.set(key, stringValue);
    }

    async get<T>(key: string): Promise<T | null> {
        const value = await this.redisClient.get(key);
        return value ? (JSON.parse(value) as T) : null;
    }

    async del(key: string): Promise<number> {
        return this.redisClient.del(key);
    }

    getClient(): Redis {
        return this.redisClient;
    }
}