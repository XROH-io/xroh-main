/**
 * Status Enums & Constants
 * Transaction and execution status definitions
 */

/**
 * Route status during lifecycle
 */
export enum RouteStatus {
  QUOTE_PENDING = 'quote_pending',
  QUOTE_READY = 'quote_ready',
  QUOTE_EXPIRED = 'quote_expired',
  EXECUTION_PENDING = 'execution_pending',
  EXECUTION_IN_PROGRESS = 'execution_in_progress',
  EXECUTION_SUCCESS = 'execution_success',
  EXECUTION_FAILED = 'execution_failed',
}

/**
 * Transaction status on blockchain
 */
export enum TransactionStatus {
  AWAITING_SIGNATURE = 'awaiting_signature',
  PENDING = 'pending',
  BROADCASTING = 'broadcasting',
  CONFIRMING = 'confirming',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
  REPLACED = 'replaced', // For EVM transactions that were replaced
}

/**
 * Provider health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Quote cache status
 */
export enum CacheStatus {
  HIT = 'hit',
  MISS = 'miss',
  STALE = 'stale',
  EXPIRED = 'expired',
}

/**
 * Execution priority levels
 */
export enum ExecutionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Route validation status
 */
export enum ValidationStatus {
  VALID = 'valid',
  INVALID_AMOUNT = 'invalid_amount',
  INVALID_CHAIN = 'invalid_chain',
  INVALID_TOKEN = 'invalid_token',
  INSUFFICIENT_LIQUIDITY = 'insufficient_liquidity',
  UNSUPPORTED_ROUTE = 'unsupported_route',
}

/**
 * Status display names
 */
export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  [TransactionStatus.AWAITING_SIGNATURE]: 'Awaiting Signature',
  [TransactionStatus.PENDING]: 'Pending',
  [TransactionStatus.BROADCASTING]: 'Broadcasting',
  [TransactionStatus.CONFIRMING]: 'Confirming',
  [TransactionStatus.SUCCESS]: 'Success',
  [TransactionStatus.FAILED]: 'Failed',
  [TransactionStatus.TIMEOUT]: 'Timeout',
  [TransactionStatus.REPLACED]: 'Replaced',
};

/**
 * Status emoji indicators for logs
 */
export const STATUS_EMOJI: Record<TransactionStatus, string> = {
  [TransactionStatus.AWAITING_SIGNATURE]: '✍️',
  [TransactionStatus.PENDING]: '⏳',
  [TransactionStatus.BROADCASTING]: '📡',
  [TransactionStatus.CONFIRMING]: '🔄',
  [TransactionStatus.SUCCESS]: '✅',
  [TransactionStatus.FAILED]: '❌',
  [TransactionStatus.TIMEOUT]: '⏱️',
  [TransactionStatus.REPLACED]: '🔄',
};
