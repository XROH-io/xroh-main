import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisUsername = this.configService.get<string>('REDIS_USERNAME');
    const redisDb = this.configService.get<number>('REDIS_DB', 0);

    try {
      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy: (times: number) => {
            if (times > 3) return null; // stop retrying
            return Math.min(times * 200, 2000);
          },
          reconnectOnError: (err) => {
            return err.message.includes('READONLY');
          },
        });
      } else {
        this.client = new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          username: redisUsername || undefined,
          db: redisDb,
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy: (times: number) => {
            if (times > 3) return null; // stop retrying
            return Math.min(times * 200, 2000);
          },
        });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis client connected');
      });

      this.client.on('error', (error: Error) => {
        this.logger.warn(`Redis client error (degraded mode): ${error.message}`);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('Redis client ready');
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Test connection with a short timeout
      await this.client.ping();
      this.logger.log('Redis connection successful');
    } catch (error) {
      this.logger.warn(
        `Redis unavailable — running in degraded (no-cache) mode. Error: ${(error as Error).message}`,
      );
      // Do NOT re-throw; allow the backend to start without Redis
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  // Cache operations — all are no-ops when client is unavailable
  async get(key: string): Promise<string | null> {
    const c = this.client;
    if (!c) return null;
    return c.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const c = this.client;
    if (!c) return;
    if (ttlSeconds) {
      await c.setex(key, ttlSeconds, value);
    } else {
      await c.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    const c = this.client;
    if (!c) return;
    await c.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const c = this.client;
    if (!c) return false;
    const result = await c.exists(key);
    return result === 1;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    const jsonValue = JSON.stringify(value);
    await this.set(key, jsonValue, ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to parse JSON for key ${key}:`, error);
      return null;
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    const c = this.client;
    if (!c) return;
    const keys = await c.keys(pattern);
    if (keys.length > 0) {
      await c.del(...keys);
    }
  }

  async ping(): Promise<string> {
    const c = this.client;
    if (!c) return 'PONG (degraded)';
    return c.ping();
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}
