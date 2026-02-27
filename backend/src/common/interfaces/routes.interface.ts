/**
 * Core Route Interfaces
 * Defines normalized route structures and quote parameters
 */

/**
 * Normalized route structure used across all providers
 * This is the unified format that all provider responses are converted to
 */
export interface NormalizedRoute {
  route_id: string;
  provider: 'lifi' | 'mayan' | 'changenow';

  // Chain and token information
  source_chain: string;
  destination_chain: string;
  source_token: string;
  destination_token: string;

  // Amounts (in smallest unit - wei/lamports)
  input_amount: string;
  output_amount: string;

  // Fee breakdown
  total_fee: RouteFee;

  // Timing
  estimated_time: number; // seconds

  // Risk metrics
  slippage_tolerance: number;
  slippage_risk: 'low' | 'medium' | 'high';

  // Route details
  steps: RouteStep[];

  // Scoring
  reliability_score: number; // 0-100
  liquidity_score: number; // 0-100

  // Raw data for debugging
  raw_provider_data: any;

  // Metadata
  created_at?: Date;
  expires_at?: Date;
}

/**
 * Fee structure breakdown
 */
export interface RouteFee {
  network_fee: string;
  bridge_fee: string;
  protocol_fee: string;
  total_fee_usd?: number; // Optional USD value
}

/**
 * Individual step in a multi-step route
 */
export interface RouteStep {
  step_number: number;
  action: 'swap' | 'bridge' | 'approval';
  protocol: string;
  from_token: string;
  to_token: string;
  expected_output: string;
  estimated_gas: string;
  chain?: string; // Optional chain identifier for this step
}

/**
 * Quote request parameters from user
 */
export interface QuoteParams {
  source_chain: string;
  destination_chain: string;
  source_token: string;
  destination_token: string;
  amount: string;
  user_wallet?: string;
  slippage_tolerance?: number;
  strategy?: string;
}

/**
 * Quote response to user
 */
export interface QuoteResponse {
  recommended_route: NormalizedRoute;
  backup_routes: NormalizedRoute[];
  explanation?: string;
  portfolio_impact?: any; // Will be defined in portfolio interface
}
