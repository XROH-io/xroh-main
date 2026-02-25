import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './config/redis.module';
import { QueueModule } from './config/queue.module';
import { AppConfigService } from './config/app-config.service';
import { validationSchema } from './config/env.validation';
import { HealthModule } from './common/health/health.module';

@Module({
  imports: [
    // Configuration module with environment validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', `.env.${process.env.NODE_ENV}`],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    // Logger module
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        customProps: () => ({
          context: 'HTTP',
        }),
      },
    }),
    // Redis and Queue modules
    RedisModule,
    QueueModule,
    // Health check module
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
