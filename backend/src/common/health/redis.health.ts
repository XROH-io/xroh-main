import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { RedisService } from '../../config/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pingResult = await this.redisService.ping();
      const isHealthy = pingResult === 'PONG' && this.redisService.isHealthy();

      const result = this.getStatus(key, isHealthy, {
        message: isHealthy ? 'Redis is available' : 'Redis is unavailable',
      });

      if (isHealthy) {
        return result;
      }

      throw new HealthCheckError('Redis health check failed', result);
    } catch (error) {
      const result = this.getStatus(key, false, {
        message: error.message || 'Redis is unavailable',
      });
      throw new HealthCheckError('Redis health check failed', result);
    }
  }
}
