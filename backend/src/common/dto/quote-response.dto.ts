/**
 * Quote Response DTO
 * Structures quote responses with normalized routes
 */

import { ApiProperty } from '@nestjs/swagger';

/**
 * Individual route step details
 */
export class RouteStepDto {
  @ApiProperty({ example: 1 })
  step_number: number;

  @ApiProperty({ example: 'swap' })
  action_type: string;

  @ApiProperty({ example: 'lifi' })
  provider: string;

  @ApiProperty({ example: 'solana' })
  chain: string;

  @ApiProperty({ example: 'So11111111111111111111111111111111111111112' })
  token_in: string;

  @ApiProperty({ example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' })
  token_out: string;

  @ApiProperty({ example: '1000000000' })
  amount_in: string;

  @ApiProperty({ example: '999500000' })
  amount_out: string;

  @ApiProperty({ example: 30 })
  estimated_time: number;
}

/**
 * Fee breakdown
 */
export class RouteFeeDto {
  @ApiProperty({ example: '5000' })
  gas_fee: string;

  @ApiProperty({ example: '500000' })
  protocol_fee: string;

  @ApiProperty({ example: '505000' })
  total_fee: string;

  @ApiProperty({ example: 'lamports' })
  fee_token: string;
}

/**
 * Single normalized route
 */
export class NormalizedRouteDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  route_id: string;

  @ApiProperty({ example: 'lifi' })
  provider: string;

  @ApiProperty({ example: 'solana' })
  source_chain: string;

  @ApiProperty({ example: 'ethereum' })
  destination_chain: string;

  @ApiProperty({ example: 'So11111111111111111111111111111111111111112' })
  source_token: string;

  @ApiProperty({ example: '0x0000000000000000000000000000000000000000' })
  destination_token: string;

  @ApiProperty({ example: '1000000000' })
  input_amount: string;

  @ApiProperty({ example: '998500000' })
  output_amount: string;

  @ApiProperty({ type: RouteFeeDto })
  total_fee: RouteFeeDto;

  @ApiProperty({ example: 120 })
  estimated_time: number;

  @ApiProperty({ example: 1.0 })
  slippage_tolerance: number;

  @ApiProperty({ example: 'low' })
  slippage_risk: string;

  @ApiProperty({ example: 0.95 })
  reliability_score: number;

  @ApiProperty({ example: 0.85 })
  liquidity_score: number;

  @ApiProperty({ type: [RouteStepDto] })
  steps: RouteStepDto[];
}

/**
 * Complete quote response with multiple routes
 */
export class QuoteResponseDto {
  @ApiProperty({ type: [NormalizedRouteDto] })
  routes: NormalizedRouteDto[];

  @ApiProperty({ example: 3 })
  total_routes: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  recommended_route_id: string;

  @ApiProperty({ example: 'lowest_cost' })
  strategy_used: string;

  @ApiProperty({ example: 250 })
  response_time_ms: number;

  @ApiProperty({
    example: {
      lifi: 'success',
      mayan: 'success',
      changenow: 'timeout',
    },
  })
  provider_statuses: Record<string, string>;
}
