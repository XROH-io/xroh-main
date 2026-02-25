/**
 * Provider Enums & Constants
 * Bridge provider configurations and priorities
 */

/**
 * Supported bridge/swap providers
 */
export enum Provider {
  LIFI = 'lifi',
  MAYAN = 'mayan',
  CHANGENOW = 'changenow',
}

/**
 * Provider display names
 */
export const PROVIDER_NAMES: Record<Provider, string> = {
  [Provider.LIFI]: 'LI.FI',
  [Provider.MAYAN]: 'Mayan Finance',
  [Provider.CHANGENOW]: 'ChangeNOW',
};

/**
 * Provider priority order (lower = higher priority)
 */
export const PROVIDER_PRIORITY: Record<Provider, number> = {
  [Provider.LIFI]: 1,
  [Provider.MAYAN]: 2,
  [Provider.CHANGENOW]: 3,
};

/**
 * Provider specialization (what they're best at)
 */
export enum ProviderSpecialization {
  SOLANA_FOCUSED = 'solana_focused',
  EVM_FOCUSED = 'evm_focused',
  MULTI_CHAIN = 'multi_chain',
  CEX_INTEGRATION = 'cex_integration',
}

/**
 * Provider specialization mapping
 */
export const PROVIDER_SPECIALIZATIONS: Record<Provider, ProviderSpecialization> = {
  [Provider.LIFI]: ProviderSpecialization.MULTI_CHAIN,
  [Provider.MAYAN]: ProviderSpecialization.SOLANA_FOCUSED,
  [Provider.CHANGENOW]: ProviderSpecialization.CEX_INTEGRATION,
};

/**
 * Default timeout for provider API calls (ms)
 */
export const PROVIDER_TIMEOUTS: Record<Provider, number> = {
  [Provider.LIFI]: 5000,
  [Provider.MAYAN]: 5000,
  [Provider.CHANGENOW]: 8000, // CEX-based, slower
};

/**
 * Max retry attempts per provider
 */
export const PROVIDER_MAX_RETRIES: Record<Provider, number> = {
  [Provider.LIFI]: 3,
  [Provider.MAYAN]: 3,
  [Provider.CHANGENOW]: 2,
};
