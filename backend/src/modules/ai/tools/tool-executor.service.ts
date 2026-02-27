/**
 * Tool Executor Service
 * Executes tools that the AI agent calls via Claude function-calling.
 * Each tool maps to existing backend services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ChangenowService } from '../../providers/changenow/changenow.service';
import { ProviderHealthService } from '../../providers/provider-health.service';
import { ScoringService } from '../../routes/scoring.service';
import { RouteComparisonService } from '../../routes/route-comparison.service';
import { ToolContext, ToolResult } from '../interfaces';

// Token metadata for supported tokens/chains
const SUPPORTED_CHAINS = [
  {
    name: 'solana',
    displayName: 'Solana',
    nativeToken: 'SOL',
    chainId: 'solana',
  },
  {
    name: 'ethereum',
    displayName: 'Ethereum',
    nativeToken: 'ETH',
    chainId: '1',
  },
  {
    name: 'polygon',
    displayName: 'Polygon',
    nativeToken: 'MATIC',
    chainId: '137',
  },
  {
    name: 'arbitrum',
    displayName: 'Arbitrum',
    nativeToken: 'ETH',
    chainId: '42161',
  },
  { name: 'base', displayName: 'Base', nativeToken: 'ETH', chainId: '8453' },
  {
    name: 'optimism',
    displayName: 'Optimism',
    nativeToken: 'ETH',
    chainId: '10',
  },
  {
    name: 'avalanche',
    displayName: 'Avalanche',
    nativeToken: 'AVAX',
    chainId: '43114',
  },
  { name: 'bsc', displayName: 'BNB Chain', nativeToken: 'BNB', chainId: '56' },
];

const POPULAR_TOKENS = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    chains: [
      'solana',
      'ethereum',
      'polygon',
      'arbitrum',
      'base',
      'avalanche',
      'bsc',
      'optimism',
    ],
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    chains: ['solana', 'ethereum', 'polygon', 'arbitrum', 'bsc', 'avalanche'],
  },
  { symbol: 'SOL', name: 'Solana', chains: ['solana'] },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    chains: ['ethereum', 'arbitrum', 'base', 'optimism', 'polygon'],
  },
  { symbol: 'MATIC', name: 'Polygon', chains: ['polygon', 'ethereum'] },
  { symbol: 'BNB', name: 'BNB', chains: ['bsc'] },
  { symbol: 'AVAX', name: 'Avalanche', chains: ['avalanche'] },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chains: ['ethereum', 'polygon', 'arbitrum'],
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
  },
];

@Injectable()
export class ToolExecutorService {
  private readonly logger = new Logger(ToolExecutorService.name);

  constructor(
    private readonly changenow: ChangenowService,
    private readonly providerHealth: ProviderHealthService,
    private readonly scoringService: ScoringService,
    private readonly routeComparison: RouteComparisonService,
  ) {}

  /**
   * Execute a tool by name with given input
   */
  async executeTool(
    toolName: string,
    input: any,
    context: ToolContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();
    this.logger.log(`Executing tool: ${toolName}`);

    try {
      let result: ToolResult;

      switch (toolName) {
        case 'get_supported_chains':
          result = await this.getSupportedChains();
          break;
        case 'get_supported_tokens':
          result = await this.getSupportedTokens(input);
          break;
        case 'fetch_bridge_quotes':
          result = await this.fetchBridgeQuotes(input, context);
          break;
        case 'get_token_prices':
          result = await this.getTokenPrices(input);
          break;
        case 'check_provider_health':
          result = await this.checkProviderHealth();
          break;
        case 'compare_routes':
          result = await this.compareRoutes(input, context);
          break;
        case 'prepare_bridge_transaction':
          result = this.prepareBridgeTransaction(input, context);
          break;
        case 'check_transaction_status':
          result = await this.checkTransactionStatus(input);
          break;
        default:
          result = { success: false, error: `Unknown tool: ${toolName}` };
      }

      const elapsed = Date.now() - startTime;
      this.logger.log(`Tool ${toolName} completed in ${elapsed}ms`);
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(
        `Tool ${toolName} failed after ${elapsed}ms: ${error.message}`,
      );
      return {
        success: false,
        error: `Tool execution failed: ${error.message}`,
      };
    }
  }

  // ─── Tool Implementations ──────────────────────────────────────────────

  private async getSupportedChains(): Promise<ToolResult> {
    return {
      success: true,
      data: {
        chains: SUPPORTED_CHAINS,
        total: SUPPORTED_CHAINS.length,
      },
      displayMessage: `XROH supports ${SUPPORTED_CHAINS.length} chains: ${SUPPORTED_CHAINS.map((c) => c.displayName).join(', ')}.`,
    };
  }

  private async getSupportedTokens(input: {
    chain?: string;
  }): Promise<ToolResult> {
    let tokens = POPULAR_TOKENS;
    if (input.chain) {
      tokens = tokens.filter((t) =>
        t.chains.includes(input.chain!.toLowerCase()),
      );
    }
    return {
      success: true,
      data: { tokens, total: tokens.length, filter: input.chain || 'all' },
      displayMessage: `Found ${tokens.length} tokens${input.chain ? ` on ${input.chain}` : ''}: ${tokens.map((t) => t.symbol).join(', ')}.`,
    };
  }

  private async fetchBridgeQuotes(
    input: {
      source_chain: string;
      destination_chain: string;
      source_token: string;
      destination_token: string;
      amount: string;
      slippage_tolerance?: number;
    },
    context: ToolContext,
  ): Promise<ToolResult> {
    const srcChain = input.source_chain.toLowerCase();
    const dstChain = input.destination_chain.toLowerCase();

    // Check if ChangeNOW supports this route
    if (!this.changenow.supportsRoute(srcChain, dstChain)) {
      return {
        success: false,
        error: `This route from ${input.source_chain} to ${input.destination_chain} is not supported. Supported chains: Ethereum, Polygon, Arbitrum, Binance Smart Chain, Solana.`,
        displayMessage: `The route from ${input.source_chain} to ${input.destination_chain} is not supported. Please try a supported chain pair.`,
      };
    }

    try {
      const route = await this.changenow.getQuote({
        source_chain: srcChain,
        destination_chain: dstChain,
        source_token: input.source_token,
        destination_token: input.destination_token,
        amount: input.amount,
        user_wallet: context.walletAddress,
        slippage_tolerance: input.slippage_tolerance || 0.005,
      });

      const estimatedTime = route.estimated_time;
      const timeHuman =
        estimatedTime < 60
          ? `${estimatedTime}s`
          : `${Math.round(estimatedTime / 60)} min`;

      const routeSummary = {
        rank: 1,
        route_id: route.route_id,
        provider: 'ChangeNOW',
        source_chain: route.source_chain,
        destination_chain: route.destination_chain,
        source_token: route.source_token,
        destination_token: route.destination_token,
        input_amount: route.input_amount,
        output_amount: route.output_amount,
        estimated_time_seconds: estimatedTime,
        estimated_time_human: timeHuman,
        slippage_risk: route.slippage_risk,
        reliability_score: route.reliability_score,
        steps: route.steps.length,
      };

      return {
        success: true,
        data: {
          routes: [routeSummary],
          total_routes: 1,
        },
        displayMessage:
          `Best route: send ${route.input_amount} ${input.source_token} → receive ${route.output_amount} ${input.destination_token}. ` +
          `Estimated time: ${timeHuman}. Reliability: ${Math.round(route.reliability_score * 100)}%.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Quote failed: ${(error as Error).message}`,
        displayMessage: `Could not get a quote for this pair. Please check that both tokens are supported and try again.`,
      };
    }
  }

  private async getTokenPrices(input: {
    token_ids: string;
  }): Promise<ToolResult> {
    try {
      const ids = input.token_ids;
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
      const response = await fetch(url);
      const data = await response.json();
      return {
        success: true,
        data,
        displayMessage: `Price data fetched for: ${ids}.`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch prices: ${error.message}`,
      };
    }
  }

  private async checkProviderHealth(): Promise<ToolResult> {
    const statuses = this.providerHealth.getAllHealthStatuses();
    const summary = statuses.map((status) => ({
      provider: status.provider,
      healthy: status.is_healthy,
      responseTime: `${status.response_time_ms}ms`,
      lastChecked: status.last_checked,
    }));

    const healthyCount = summary.filter((s) => s.healthy).length;
    return {
      success: true,
      data: { providers: summary },
      displayMessage: `${healthyCount}/${summary.length} providers are healthy. ${summary.map((s) => `${s.provider}: ${s.healthy ? 'healthy' : 'down'}`).join(', ')}.`,
    };
  }

  private async compareRoutes(
    input: {
      source_chain: string;
      destination_chain: string;
      source_token: string;
      destination_token: string;
      amount: string;
      strategy?: string;
    },
    context: ToolContext,
  ): Promise<ToolResult> {
    // Use ChangeNOW directly — single provider, so "compare" returns the best (only) option
    return this.fetchBridgeQuotes(input, context);
  }

  private prepareBridgeTransaction(
    input: { route_id: string; user_wallet: string },
    _context: ToolContext,
  ): ToolResult {
    // Stage 2 will implement actual transaction building
    return {
      success: false,
      error:
        'Transaction execution is not yet enabled. This feature is coming in the next update. For now, I can help you find the best routes and compare options.',
      displayMessage:
        'Transaction execution is coming soon. I can help you find and compare the best routes for now.',
    };
  }

  private async checkTransactionStatus(input: {
    transaction_hash: string;
    provider: string;
  }): Promise<ToolResult> {
    // Stage 2 will implement actual status checking
    return {
      success: false,
      error:
        'Transaction status checking is not yet enabled. This feature is coming in the next update.',
    };
  }
}
