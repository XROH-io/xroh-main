/**
 * Risk & Slippage Enums
 * Risk assessment levels and thresholds
 */

/**
 * Slippage risk levels
 */
export enum SlippageRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXTREME = 'extreme',
}

/**
 * Route reliability risk
 */
export enum ReliabilityRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Liquidity risk levels
 */
export enum LiquidityRisk {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Overall route risk assessment
 */
export enum OverallRisk {
  SAFE = 'safe',
  MODERATE = 'moderate',
  RISKY = 'risky',
  VERY_RISKY = 'very_risky',
}

/**
 * Slippage thresholds (percentage)
 */
export const SLIPPAGE_THRESHOLDS = {
  [SlippageRisk.LOW]: 0.5, // <= 0.5%
  [SlippageRisk.MEDIUM]: 1.0, // <= 1.0%
  [SlippageRisk.HIGH]: 2.0, // <= 2.0%
  [SlippageRisk.EXTREME]: Infinity, // > 2.0%
};

/**
 * Default slippage tolerance per chain
 */
export const DEFAULT_SLIPPAGE = {
  solana: 1.0, // 1% for Solana (faster finality)
  ethereum: 0.5, // 0.5% for Ethereum
  polygon: 0.5,
  arbitrum: 0.5,
  optimism: 0.5,
  base: 0.5,
  binance: 1.0,
  avalanche: 0.5,
};

/**
 * Reliability score thresholds (0-1)
 */
export const RELIABILITY_THRESHOLDS = {
  [ReliabilityRisk.LOW]: 0.95, // >= 95% success rate
  [ReliabilityRisk.MEDIUM]: 0.85, // >= 85% success rate
  [ReliabilityRisk.HIGH]: 0.0, // < 85% success rate
};

/**
 * Risk warning messages
 */
export const RISK_WARNINGS: Record<OverallRisk, string> = {
  [OverallRisk.SAFE]: 'This route has low risk and high reliability.',
  [OverallRisk.MODERATE]: 'This route has moderate risk. Proceed with caution.',
  [OverallRisk.RISKY]:
    'This route has elevated risk. Consider alternative routes.',
  [OverallRisk.VERY_RISKY]:
    'This route is very risky. We recommend choosing a safer alternative.',
};
