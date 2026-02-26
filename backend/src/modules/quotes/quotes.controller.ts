/**
 * Quotes Controller
 * Handles quote aggregation requests
 */

import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { QuoteAggregatorService } from '../providers/quote-aggregator.service';
import { ChangenowService } from '../providers/changenow/changenow.service';
import { RouteComparisonService } from '../routes/route-comparison.service';
import { GetQuoteRequestDto, QuoteResponseDto } from '../../common/dto';

@Controller('quotes')
export class QuotesController {
  private readonly logger = new Logger(QuotesController.name);

  constructor(
    private readonly quoteAggregator: QuoteAggregatorService,
    private readonly changenowService: ChangenowService,
    private readonly routeComparison: RouteComparisonService,
  ) {}

  /**
   * GET /quotes/changenow-rate?source_chain=solana&destination_chain=ethereum&source_token=So11...&destination_token=0x000...&amount=1000000000&slippage=1
   * Fast ChangeNOW-only rate for the main exchange widget
   */
  @Get('changenow-rate')
  async getChangenowRate(
    @Query('source_chain') sourceChain: string,
    @Query('destination_chain') destChain: string,
    @Query('source_token') sourceToken: string,
    @Query('destination_token') destToken: string,
    @Query('amount') amount: string,
    @Query('slippage') slippage?: string,
  ) {
    this.logger.log(`ChangeNOW rate: ${sourceChain} → ${destChain}`);

    try {
      const route = await this.changenowService.getQuote({
        source_chain: sourceChain,
        destination_chain: destChain,
        source_token: sourceToken,
        destination_token: destToken,
        amount,
        slippage_tolerance: parseFloat(slippage || '1'),
      });

      return {
        success: true,
        provider: 'changenow',
        output_amount: route.output_amount,
        estimated_time: route.estimated_time,
        rate: parseFloat(route.output_amount) / (parseFloat(amount) / Math.pow(10, this.getDecimals(sourceChain, sourceToken))),
      };
    } catch (error) {
      this.logger.error(`ChangeNOW rate error: ${error.message}`);
      return {
        success: false,
        provider: 'changenow',
        output_amount: '0',
        estimated_time: 0,
        rate: 0,
        error: error.message,
      };
    }
  }

  private getDecimals(chain: string, token: string): number {
    // SOL-based tokens
    if (token === 'So11111111111111111111111111111111111111112') return 9;
    if (token === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') return 6;
    if (token === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') return 6;
    if (token === '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599') return 8;
    if (token === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') return 5;
    if (['4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'].includes(token)) return 6;
    return 18;
  }

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
