/**
 * Quotes Controller
 * Handles quote aggregation requests
 */

import { Controller, Post, Body, Logger } from '@nestjs/common';
import { QuoteAggregatorService } from '../providers/quote-aggregator.service';
import { RouteComparisonService } from '../routes/route-comparison.service';
import { GetQuoteRequestDto, QuoteResponseDto } from '../../common/dto';

@Controller('quotes')
export class QuotesController {
  private readonly logger = new Logger(QuotesController.name);

  constructor(
    private readonly quoteAggregator: QuoteAggregatorService,
    private readonly routeComparison: RouteComparisonService,
  ) {}

  @Post()
  async getQuotes(@Body() request: GetQuoteRequestDto) {
    this.logger.log(
      `Quote request: ${request.source_chain} → ${request.destination_chain} (strategy: ${request.strategy || 'lowest_cost'})`,
    );

    const result = await this.quoteAggregator.aggregateQuotes({
      source_chain: request.source_chain,
      destination_chain: request.destination_chain,
      source_token: request.source_token,
      destination_token: request.destination_token,
      amount: request.input_amount,
      slippage_tolerance: request.slippage_tolerance,
      user_wallet: request.user_wallet,
    });

    // Apply scoring and ranking
    const rankedRoutes = await this.routeComparison.scoreAndRankRoutes(
      result.routes,
      request.strategy || 'lowest_cost',
      request.user_wallet,
    );

    this.logger.log(
      `Returning ${rankedRoutes.length} routes, top score: ${rankedRoutes[0]?.score.total_score}`,
    );

    const response: QuoteResponseDto = {
      routes: rankedRoutes.map((route) => ({
        route_id: route.route_id,
        provider: route.provider,
        source_chain: route.source_chain,
        destination_chain: route.destination_chain,
        source_token: route.source_token,
        destination_token: route.destination_token,
        input_amount: route.input_amount,
        output_amount: route.output_amount,
        total_fee: {
          gas_fee: route.total_fee.network_fee,
          protocol_fee: route.total_fee.protocol_fee,
          total_fee: route.total_fee.network_fee,
          fee_token: 'ETH',
        },
        estimated_time: route.estimated_time,
        slippage_tolerance: route.slippage_tolerance,
        slippage_risk: route.slippage_risk,
        reliability_score: route.reliability_score,
        liquidity_score: route.liquidity_score,
        score: route.score,
        rank: route.rank,
        steps: route.steps.map(step => ({
          step_number: step.step_number,
          action_type: step.action,
          provider: route.provider,
          chain: step.chain || route.source_chain,
          token_in: step.from_token,
          token_out: step.to_token,
          amount_in: '0',
          amount_out: step.expected_output,
          estimated_time: 60,
        })),
      })),
      total_routes: result.total_routes,
      recommended_route_id: rankedRoutes[0]?.route_id || '',
      strategy_used: request.strategy || 'lowest_cost',
      response_time_ms: result.response_time_ms,
      provider_statuses: result.provider_statuses,
    };

    return response;
  }
}
