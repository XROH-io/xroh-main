import Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  // Database
  DATABASE_URL: Joi.string().optional(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().optional(),
  DATABASE_PASSWORD: Joi.string().optional(),
  DATABASE_NAME: Joi.string().optional(),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_MIN: Joi.number().default(2),
  DATABASE_POOL_MAX: Joi.number().default(10),

  // Redis
  REDIS_URL: Joi.string().allow('').optional(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_USERNAME: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // RPC Endpoints
  SOLANA_RPC_MAINNET: Joi.string().optional(),
  SOLANA_RPC_DEVNET: Joi.string().optional(),
  ETHEREUM_RPC_URL: Joi.string().optional(),

  // Swap & Bridge APIs
  JUPITER_API: Joi.string().default('https://lite-api.jup.ag/swap/v1'),
  JUPITER_PRICE_API_URL: Joi.string().default('https://price.jup.ag/v4'),
  RAYDIUM_API: Joi.string().default('https://transaction-v1.raydium.io'),
  RAYDIUM_FEE_API: Joi.string().default('https://api-v3.raydium.io'),

  // Bridge Provider Keys
  LIFI_API_KEY: Joi.string().optional(),
  MAYAN_API_URL: Joi.string().default('https://price-api.mayan.finance/v3'),
  CHANGENOW_API_KEY: Joi.string().optional(),
  COINGECKO_API_KEY: Joi.string().allow('').optional(),
  COINMARKETCAP_API_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Caching
  QUOTE_CACHE_TTL: Joi.number().default(30),
  PRICE_CACHE_TTL: Joi.number().default(30),
  BALANCE_CACHE_TTL: Joi.number().default(120),

  // Queue
  QUEUE_CONCURRENCY: Joi.number().default(5),
  QUEUE_MAX_RETRIES: Joi.number().default(3),
  QUEUE_BACKOFF_DELAY: Joi.number().default(5000),

  // Security
  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
  API_KEY_SALT: Joi.string().optional(),
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRATION: Joi.string().default('7d'),

  // Feature Flags
  ENABLE_AUTO_FAILOVER: Joi.boolean().default(true),
  ENABLE_PORTFOLIO_ANALYSIS: Joi.boolean().default(true),
  ENABLE_AI_EXPLANATIONS: Joi.boolean().default(true),
  ENABLE_WEBSOCKETS: Joi.boolean().default(true),

  // Monitoring
  PROMETHEUS_ENABLED: Joi.boolean().default(false),
  SENTRY_DSN: Joi.string().allow('').optional(),
});
