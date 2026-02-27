/**
 * Provider Health Monitor Service
 * Tracks provider availability and performance
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LifiService } from './lifi/lifi.service';
import { MayanService } from './mayan/mayan.service';
import { ChangenowService } from './changenow/changenow.service';
import { PrismaService } from '../../config/prisma.service';
import {
  ProviderConnector,
  ProviderHealthStatus,
} from '../../common/interfaces';

@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);
  private providers: ProviderConnector[];
  private healthCache: Map<string, ProviderHealthStatus> = new Map();

  constructor(
    private readonly lifiService: LifiService,
    private readonly mayanService: MayanService,
    private readonly changenowService: ChangenowService,
    private readonly prismaService: PrismaService,
  ) {
    this.providers = [
      this.lifiService,
      this.mayanService,
      this.changenowService,
    ];
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthChecks() {
    this.logger.log('Running provider health checks...');

    const healthResults = await Promise.allSettled(
      this.providers.map((provider) => provider.healthCheck()),
    );

    healthResults.forEach((result, index) => {
      const providerName = this.providers[index].name;

      if (result.status === 'fulfilled') {
        this.healthCache.set(providerName, result.value);
        this.logHealthStatus(result.value);
        this.updateReliabilityMetrics(result.value);
      } else {
        this.logger.error(
          `Health check failed for ${providerName}: ${result.reason?.message}`,
        );
      }
    });
  }

  getHealthStatus(providerName: string): ProviderHealthStatus | null {
    return this.healthCache.get(providerName) || null;
  }

  getAllHealthStatuses(): ProviderHealthStatus[] {
    return Array.from(this.healthCache.values());
  }

  getHealthyProviders(): ProviderConnector[] {
    return this.providers.filter((provider) => {
      const health = this.healthCache.get(provider.name);
      return health?.is_healthy === true;
    });
  }

  private logHealthStatus(health: ProviderHealthStatus) {
    const emoji = health.is_healthy ? '✅' : '❌';
    this.logger.log(
      `${emoji} ${health.provider}: ${health.is_healthy ? 'healthy' : 'unhealthy'} (${health.response_time_ms}ms)`,
    );
  }

  private dbUnreachableLogged = false;

  private async updateReliabilityMetrics(health: ProviderHealthStatus) {
    try {
      await this.prismaService.providerReliability.upsert({
        where: { provider: health.provider },
        create: {
          provider: health.provider,
          is_healthy: health.is_healthy,
          health_check_last_run: health.last_checked,
          average_response_time_ms: health.response_time_ms,
        },
        update: {
          is_healthy: health.is_healthy,
          health_check_last_run: health.last_checked,
          average_response_time_ms: health.response_time_ms,
          consecutive_failures: health.is_healthy ? 0 : { increment: 1 },
        },
      });
      // Reset flag once DB becomes reachable again
      this.dbUnreachableLogged = false;
    } catch (error) {
      // Log only once until DB recovers — avoids log spam on every cron tick
      if (!this.dbUnreachableLogged) {
        this.logger.warn(
          `DB unreachable — provider reliability metrics will not persist until reconnected: ${error.message}`,
        );
        this.dbUnreachableLogged = true;
      } else {
        this.logger.debug(
          `Skipping reliability upsert — DB still unreachable (${health.provider})`,
        );
      }
    }
  }
}
