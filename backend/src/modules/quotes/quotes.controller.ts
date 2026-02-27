/**
 * Quotes Controller
 * Handles quote aggregation requests
 */

import { Controller, Post, Body, Get, Query, Param, Logger, HttpException, HttpStatus } from '@nestjs/common';
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

      // amount is human-readable (e.g. "10" for 10 SOL), no decimals conversion needed
      const inputHuman = parseFloat(amount);
      return {
        success: true,
        provider: 'changenow',
        output_amount: route.output_amount,
        estimated_time: route.estimated_time,
        rate: inputHuman > 0 ? parseFloat(route.output_amount) / inputHuman : 0,
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

  /**
   * POST /quotes/changenow-exchange
   * Creates a real ChangeNOW exchange. Returns the deposit address where the user
   * must send funds, plus the exchange ID for tracking.
   */
  @Post('changenow-exchange')
  async createChangeNowExchange(
    @Body()
    body: {
      source_chain: string;
      destination_chain: string;
      source_token: string;
      destination_token: string;
      amount: string;
      payout_address: string;
    },
  ) {
    if (!body.payout_address?.trim()) {
      throw new HttpException('payout_address is required', HttpStatus.BAD_REQUEST);
    }
    if (!body.amount || parseFloat(body.amount) <= 0) {
      throw new HttpException('amount must be greater than 0', HttpStatus.BAD_REQUEST);
    }

    // Resolve currency tickers from token addresses using the same mapping as getQuote
    const fromCurrency = this.resolveCurrency(body.source_token, body.source_chain);
    const toCurrency = this.resolveCurrency(body.destination_token, body.destination_chain);

    this.logger.log(
      `Creating exchange: ${body.amount} ${fromCurrency} → ${toCurrency}, payout: ${body.payout_address}`,
    );

    try {
      const exchange = await this.changenowService.createExchange({
        fromCurrency,
        toCurrency,
        fromAmount: body.amount,
        payoutAddress: body.payout_address,
      });

      return {
        success: true,
        exchange_id: exchange.id,
        payin_address: exchange.payinAddress,
        from_currency: exchange.fromCurrency,
        to_currency: exchange.toCurrency,
        from_amount: exchange.fromAmount,
        to_amount: exchange.toAmount,
        payout_address: exchange.payoutAddress,
        status: exchange.status,
        valid_until: exchange.validUntil,
      };
    } catch (error) {
      this.logger.error(`ChangeNOW exchange creation failed: ${error.message}`);
      throw new HttpException(
        { success: false, error: error.response?.data?.message || error.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * GET /quotes/changenow-status/:exchangeId
   * Polls exchange status. Returns payoutHash once the exchange is confirmed.
   */
  @Get('changenow-status/:exchangeId')
  async getChangeNowStatus(@Param('exchangeId') exchangeId: string) {
    try {
      const detail = await this.changenowService.getExchangeDetail(exchangeId);
      return {
        success: true,
        exchange_id: detail.id,
        status: detail.status,
        payout_hash: detail.payoutHash ?? null,
        payin_hash: detail.payinHash ?? null,
        from_amount: detail.fromAmount,
        to_amount: detail.toAmount,
        is_complete: detail.status === 'finished',
        is_failed: ['failed', 'refunded', 'expired'].includes(detail.status),
      };
    } catch (error) {
      throw new HttpException(
        { success: false, error: error.message },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Map token address/symbol to ChangeNOW currency ticker */
  private resolveCurrency(token: string, chain: string): string {
    const map: Record<string, string> = {
      So11111111111111111111111111111111111111112: 'sol',
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'usdc',
      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'usdt',
      '0x0000000000000000000000000000000000000000': chain === 'binance' ? 'bnb' : 'eth',
      '0x0000000000000000000000000000000000001010': 'matic',
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'dai',
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'wbtc',
      '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'link',
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'uni',
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': 'aave',
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'ray',
      JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'jup',
      DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'bonk',
      EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: 'wif',
      '0x912CE59144191C1204E64559FE8253a0e49E6548': 'arb',
      '0x4200000000000000000000000000000000000042': 'op',
    };
    return map[token] ?? token.toLowerCase();
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
        steps: route.steps.map((step) => ({
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
