import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  // Application Config
  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get logLevel(): string {
    return this.configService.get<string>('LOG_LEVEL', 'info');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  // Database Config
  getDatabaseConfig() {
    return {
      url: this.configService.get<string>('DATABASE_URL'),
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      user: this.configService.get<string>('DATABASE_USER'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
      ssl: this.configService.get<boolean>('DATABASE_SSL', false),
      poolMin: this.configService.get<number>('DATABASE_POOL_MIN', 2),
      poolMax: this.configService.get<number>('DATABASE_POOL_MAX', 10),
    };
  }

  // Redis Config
  getRedisConfig() {
    return {
      url: this.configService.get<string>('REDIS_URL'),
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    };
  }

  // RPC Endpoints
  getRpcEndpoints() {
    return {
      solana: {
        mainnet: this.configService.get<string>(
          'SOLANA_RPC_MAINNET',
          'https://api.mainnet-beta.solana.com',
        ),
        devnet: this.configService.get<string>(
          'SOLANA_RPC_DEVNET',
          'https://api.devnet.solana.com',
        ),
        heliusApiKey: this.configService.get<string>('SOLANA_RPC_HELIUS_API_KEY'),
      },
      ethereum: this.configService.get<string>('ETHEREUM_RPC_URL'),
      polygon: this.configService.get<string>('POLYGON_RPC_URL'),
      arbitrum: this.configService.get<string>('ARBITRUM_RPC_URL'),
      optimism: this.configService.get<string>('OPTIMISM_RPC_URL'),
      base: this.configService.get<string>('BASE_RPC_URL'),
    };
  }

  // Swap & Bridge APIs
  getSwapApis() {
    return {
      jupiter: this.configService.get<string>(
        'JUPITER_API',
        'https://lite-api.jup.ag/swap/v1',
      ),
      jupiterPrice: this.configService.get<string>(
        'JUPITER_PRICE_API_URL',
        'https://price.jup.ag/v4',
      ),
      raydium: this.configService.get<string>(
        'RAYDIUM_API',
        'https://transaction-v1.raydium.io',
      ),
      raydiumFee: this.configService.get<string>(
        'RAYDIUM_FEE_API',
        'https://api-v3.raydium.io',
      ),
    };
  }

  // API Keys
  getApiKeys() {
    return {
      lifi: this.configService.get<string>('LIFI_API_KEY'),
      mayanUrl: this.configService.get<string>(
        'MAYAN_API_URL',
        'https://price-api.mayan.finance/v3',
      ),
      changenow: this.configService.get<string>('CHANGENOW_API_KEY'),
      coingecko: this.configService.get<string>('COINGECKO_API_KEY'),
      coinmarketcap: this.configService.get<string>('COINMARKETCAP_API_KEY'),
      openai: this.configService.get<string>('OPENAI_API_KEY'),
      anthropic: this.configService.get<string>('ANTHROPIC_API_KEY'),
    };
  }

  // Rate Limits
  getRateLimits() {
    return {
      ttl: this.configService.get<number>('RATE_LIMIT_TTL', 60),
      max: this.configService.get<number>('RATE_LIMIT_MAX', 100),
      freeTier: this.configService.get<number>('RATE_LIMIT_FREE_TIER', 10),
      proTier: this.configService.get<number>('RATE_LIMIT_PRO_TIER', 100),
      enterpriseTier: this.configService.get<number>(
        'RATE_LIMIT_ENTERPRISE_TIER',
        1000,
      ),
    };
  }

  // Cache TTLs
  getCacheTtls() {
    return {
      quote: this.configService.get<number>('QUOTE_CACHE_TTL', 30),
      price: this.configService.get<number>('PRICE_CACHE_TTL', 30),
      balance: this.configService.get<number>('BALANCE_CACHE_TTL', 120),
      providerHealth: this.configService.get<number>(
        'PROVIDER_HEALTH_CACHE_TTL',
        300,
      ),
    };
  }

  // Queue Config
  getQueueConfig() {
    return {
      concurrency: this.configService.get<number>('QUEUE_CONCURRENCY', 5),
      maxRetries: this.configService.get<number>('QUEUE_MAX_RETRIES', 3),
      backoffDelay: this.configService.get<number>('QUEUE_BACKOFF_DELAY', 5000),
    };
  }

  // Security Config
  getSecurityConfig() {
    return {
      corsOrigins: this.configService
        .get<string>('CORS_ORIGINS', 'http://localhost:3000')
        .split(','),
      apiKeySalt: this.configService.get<string>('API_KEY_SALT'),
      jwtSecret: this.configService.get<string>('JWT_SECRET'),
      jwtExpiration: this.configService.get<string>('JWT_EXPIRATION', '7d'),
    };
  }

  // Feature Flags
  getFeatureFlags() {
    return {
      autoFailover: this.configService.get<boolean>('ENABLE_AUTO_FAILOVER', true),
      portfolioAnalysis: this.configService.get<boolean>(
        'ENABLE_PORTFOLIO_ANALYSIS',
        true,
      ),
      aiExplanations: this.configService.get<boolean>(
        'ENABLE_AI_EXPLANATIONS',
        true,
      ),
      websockets: this.configService.get<boolean>('ENABLE_WEBSOCKETS', true),
    };
  }

  // Monitoring Config
  getMonitoringConfig() {
    return {
      prometheusEnabled: this.configService.get<boolean>(
        'PROMETHEUS_ENABLED',
        false,
      ),
      sentryDsn: this.configService.get<string>('SENTRY_DSN'),
      grafanaUrl: this.configService.get<string>('GRAFANA_URL'),
    };
  }
}
