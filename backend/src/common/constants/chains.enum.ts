/**
 * Chain Enums & Constants
 * Supported blockchains and chain-specific configurations
 */

/**
 * Supported blockchain networks
 */
export enum Chain {
  SOLANA = 'solana',
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  BASE = 'base',
  BINANCE = 'binance',
  AVALANCHE = 'avalanche',
}

/**
 * Chain IDs mapping (EVM chains use numeric IDs)
 */
export const CHAIN_IDS: Record<Chain, string | number> = {
  [Chain.SOLANA]: 'mainnet-beta',
  [Chain.ETHEREUM]: 1,
  [Chain.POLYGON]: 137,
  [Chain.ARBITRUM]: 42161,
  [Chain.OPTIMISM]: 10,
  [Chain.BASE]: 8453,
  [Chain.BINANCE]: 56,
  [Chain.AVALANCHE]: 43114,
};

/**
 * Human-readable chain names
 */
export const CHAIN_NAMES: Record<Chain, string> = {
  [Chain.SOLANA]: 'Solana',
  [Chain.ETHEREUM]: 'Ethereum',
  [Chain.POLYGON]: 'Polygon',
  [Chain.ARBITRUM]: 'Arbitrum',
  [Chain.OPTIMISM]: 'Optimism',
  [Chain.BASE]: 'Base',
  [Chain.BINANCE]: 'BNB Chain',
  [Chain.AVALANCHE]: 'Avalanche',
};

/**
 * Native token addresses (zero address for EVM, special for Solana)
 */
export const NATIVE_TOKEN_ADDRESSES: Record<Chain, string> = {
  [Chain.SOLANA]: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  [Chain.ETHEREUM]: '0x0000000000000000000000000000000000000000',
  [Chain.POLYGON]: '0x0000000000000000000000000000000000000000',
  [Chain.ARBITRUM]: '0x0000000000000000000000000000000000000000',
  [Chain.OPTIMISM]: '0x0000000000000000000000000000000000000000',
  [Chain.BASE]: '0x0000000000000000000000000000000000000000',
  [Chain.BINANCE]: '0x0000000000000000000000000000000000000000',
  [Chain.AVALANCHE]: '0x0000000000000000000000000000000000000000',
};

/**
 * Average block times in seconds
 */
export const CHAIN_BLOCK_TIMES: Record<Chain, number> = {
  [Chain.SOLANA]: 0.4,
  [Chain.ETHEREUM]: 12,
  [Chain.POLYGON]: 2,
  [Chain.ARBITRUM]: 0.25,
  [Chain.OPTIMISM]: 2,
  [Chain.BASE]: 2,
  [Chain.BINANCE]: 3,
  [Chain.AVALANCHE]: 2,
};

/**
 * Required confirmations for finality
 */
export const CHAIN_CONFIRMATIONS: Record<Chain, number> = {
  [Chain.SOLANA]: 32,
  [Chain.ETHEREUM]: 12,
  [Chain.POLYGON]: 128,
  [Chain.ARBITRUM]: 1,
  [Chain.OPTIMISM]: 1,
  [Chain.BASE]: 1,
  [Chain.BINANCE]: 15,
  [Chain.AVALANCHE]: 1,
};

/**
 * Chain type (EVM or non-EVM)
 */
export enum ChainType {
  EVM = 'evm',
  SOLANA = 'solana',
}

/**
 * Chain type mapping
 */
export const CHAIN_TYPES: Record<Chain, ChainType> = {
  [Chain.SOLANA]: ChainType.SOLANA,
  [Chain.ETHEREUM]: ChainType.EVM,
  [Chain.POLYGON]: ChainType.EVM,
  [Chain.ARBITRUM]: ChainType.EVM,
  [Chain.OPTIMISM]: ChainType.EVM,
  [Chain.BASE]: ChainType.EVM,
  [Chain.BINANCE]: ChainType.EVM,
  [Chain.AVALANCHE]: ChainType.EVM,
};
