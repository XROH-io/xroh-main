import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import { DatabaseHealthIndicator } from './database.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private redisHealthIndicator: RedisHealthIndicator,
    private databaseHealthIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.redisHealthIndicator.isHealthy('redis'),
      () => this.databaseHealthIndicator.isHealthy('database'),
      // Add more health checks as needed
    ]);
  }

  @Get('redis')
  @HealthCheck()
  checkRedis() {
    return this.health.check([
      () => this.redisHealthIndicator.isHealthy('redis'),
    ]);
  }

  @Get('database')
  @HealthCheck()
  checkDatabase() {
    return this.health.check([
      () => this.databaseHealthIndicator.isHealthy('database'),
    ]);
  }
}
