import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './config/redis.module';
import { QueueModule } from './config/queue.module';
import { PrismaModule } from './config/prisma.module';
import { AppConfigService } from './config/app-config.service';
import { validationSchema } from './config/env.validation';
import { HealthModule } from './common/health/health.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { RoutesModule } from './modules/routes/routes.module';
import { StrategyModule } from './modules/strategy/strategy.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { AiModule } from './modules/ai/ai.module';
import { TokensController } from './modules/tokens.controller';

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
    // Database module
    PrismaModule,
    // Health check module
    HealthModule,
    // Provider integrations
    ProvidersModule,
    // Quotes aggregation
    QuotesModule,
    // Route scoring and comparison
    RoutesModule,
    // Strategy management
    StrategyModule,
    // API Keys management
    ApiKeysModule,
    // AI Agent
    AiModule,
  ],
  controllers: [AppController, TokensController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}
