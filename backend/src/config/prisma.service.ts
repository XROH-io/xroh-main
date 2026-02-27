/**
 * Prisma Service - Database Client
 * Manages PostgreSQL connections and cleanup operations
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';

    const pool = new Pool({
      connectionString,
      // Recycle idle connections every 3 min — before Neon's 5-min auto-suspend
      idleTimeoutMillis: 180_000,
      // Fail fast if a new connection can't be established in 10 s
      connectionTimeoutMillis: 10_000,
      // Keep the pool small for Neon free tier (max 5 concurrent connections)
      max: 5,
    });

    // Drop errored clients from the pool so subsequent queries get a fresh one
    pool.on('error', (err) => {
      this.logger.warn(`pg pool client error (will be recycled): ${err.message}`);
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connection established');
      this.startKeepAlive();
    } catch (error) {
      this.logger.error('❌ Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.stopKeepAlive();
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }

  /**
   * Ping the DB every 4 minutes to prevent Neon from auto-suspending
   * the free-tier instance while the backend is running.
   */
  private startKeepAlive() {
    this.keepAliveTimer = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`;
        this.logger.debug('DB keepalive ping OK');
      } catch (err) {
        this.logger.warn(`DB keepalive ping failed: ${(err as Error).message}`);
      }
    }, 4 * 60 * 1000); // every 4 minutes
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  /**
   * Health check - verify database connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired quotes from cache
   */
  async cleanExpiredQuotes(): Promise<number> {
    const result = await this.quoteCache.deleteMany({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Clean up old executions (keep last 30 days)
   */
  async cleanOldExecutions(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.execution.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
        status: {
          in: ['success', 'failed'],
        },
      },
    });

    return result.count;
  }
}
