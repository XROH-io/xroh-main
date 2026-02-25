/**
 * Provider Interface - Base contract for all bridge/swap providers
 * Defines standard methods and health checks for providers
 */

import { NormalizedRoute, QuoteParams } from './routes.interface';
import { TransactionRequest, ExecutionResponse, ExecutionStatusUpdate } from './execution.interface';

/**
 * Health check result from provider
 */
export interface ProviderHealthStatus {
  provider: string;
  is_healthy: boolean;
  response_time_ms: number;
  last_checked: Date;
  error_message?: string;
}

/**
 * Base interface that all provider connectors must implement
 */
export interface ProviderConnector {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Supported chains by this provider
   */
  readonly supportedChains: string[];

  /**
   * Get a quote for a cross-chain swap
   */
  getQuote(params: QuoteParams): Promise<NormalizedRoute>;

  /**
   * Get multiple quotes (for route comparison)
   */
  getQuotes?(params: QuoteParams): Promise<NormalizedRoute[]>;

  /**
   * Build transaction data for execution
   */
  buildTransaction(routeId: string, userWallet: string): Promise<TransactionRequest>;

  /**
   * Get execution status by transaction hash
   */
  getStatus(transactionHash: string): Promise<ExecutionStatusUpdate>;

  /**
   * Health check - verify provider API is responsive
   */
  healthCheck(): Promise<ProviderHealthStatus>;

  /**
   * Check if provider supports this route
   */
  supportsRoute(sourceChain: string, destinationChain: string): boolean;

  /**
   * Get provider-specific limits
   */
  getLimits(): ProviderLimits;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  api_key?: string;
  api_url: string;
  timeout_ms: number;
  retry_attempts: number;
  priority: number; // For provider ordering
}

/**
 * Provider limits and constraints
 */
export interface ProviderLimits {
  min_amount: string;
  max_amount: string;
  supported_tokens: string[];
  rate_limit: {
    requests_per_second: number;
    requests_per_minute: number;
  };
}

/**
 * Provider reliability metrics
 */
export interface ProviderMetrics {
  provider: string;
  success_rate: number; // 0-1
  average_execution_time: number; // seconds
  total_executions: number;
  failed_executions: number;
  average_slippage: number; // percentage
  last_failure?: Date;
  uptime_percentage: number;
}

/**
 * Provider error response
 */
export interface ProviderError {
  provider: string;
  error_code: string;
  error_message: string;
  is_retryable: boolean;
  timestamp: Date;
}
