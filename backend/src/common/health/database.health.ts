/**
 * Database Health Indicator
 * Monitors PostgreSQL database connectivity
 */

import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.prismaService.isHealthy();

    const result = this.getStatus(key, isHealthy, {
      database: 'PostgreSQL',
      message: isHealthy
        ? 'Database is responsive'
        : 'Database is not responding',
    });

    if (!isHealthy) {
      throw new HealthCheckError('Database check failed', result);
    }

    return result;
  }
}
