/**
 * Scoring & Strategy Interfaces
 * Defines scoring weights and strategy templates
 */

/**
 * Weights for route scoring algorithm
 * All weights must sum to 1.0
 */
export interface ScoringWeights {
  fee_weight: number;
  speed_weight: number;
  reliability_weight: number;
  slippage_weight: number;
  liquidity_weight: number;
}

/**
 * Individual score components for a route
 */
export interface RouteScore {
  route_id: string;

  // Individual scores (0-100)
  fee_score: number;
  speed_score: number;
  reliability_score: number;
  slippage_score: number;
  liquidity_score: number;

  // Total weighted score
  total_score: number;

  // Human-readable explanation
  explanation: string;
}

/**
 * Strategy template definition
 */
export interface StrategyTemplate {
  name: string;
  description: string;
  weights: ScoringWeights;
}

/**
 * Route comparison result
 */
export interface RouteComparison {
  cheapest_route: any;
  fastest_route: any;
  safest_route: any;
  savings_vs_cheapest: number;
  time_difference: number;
}

/**
 * Constraints applied by strategy
 */
export interface StrategyConstraints {
  max_steps?: number;
  max_estimated_time?: number; // seconds
  min_reliability_score?: number;
  max_slippage_risk?: 'low' | 'medium' | 'high';
  preferred_providers?: string[];
  excluded_providers?: string[];
}

/**
 * Available strategy templates
 */
export type StrategyType =
  | 'lowest_cost'
  | 'fast_execution'
  | 'safety_first'
  | 'portfolio_balanced'
  | 'custom';

/**
 * User's custom strategy preferences
 */
export interface UserStrategyPreference {
  user_id: string;
  strategy_type: StrategyType;
  custom_weights?: ScoringWeights;
  custom_constraints?: StrategyConstraints;
  created_at: Date;
  updated_at: Date;
}
