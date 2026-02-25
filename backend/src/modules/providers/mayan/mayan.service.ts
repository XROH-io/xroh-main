/**
 * Mayan Provider Connector
 * Solana-focused bridge integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { fetchQuote, Quote } from '@mayanfinance/swap-sdk';
import {
  ProviderConnector,
  ProviderHealthStatus,
  ProviderLimits,
  NormalizedRoute,
  QuoteParams,
  TransactionRequest,
  ExecutionStatusUpdate,
} from '../../../common/interfaces';
import { Provider } from '../../../common/constants';
import { AppConfigService } from '../../../config/app-config.service';

@Injectable()
export class MayanService implements ProviderConnector {
  readonly name = Provider.MAYAN;
  readonly supportedChains = [
    'solana',
    'ethereum',
    'polygon',
    'arbitrum',
    'base',
    'avalanche',
  ];

  private readonly logger = new Logger(MayanService.name);

  constructor(private readonly configService: AppConfigService) {}

  async getQuote(params: QuoteParams): Promise<NormalizedRoute> {
    try {
      const quotes = await fetchQuote({
        amount: parseFloat(params.amount),
        fromToken: params.source_token,
        toToken: params.destination_token,
        fromChain: params.source_chain as any,
        toChain: params.destination_chain as any,
        slippageBps: Math.floor((params.slippage_tolerance || 1.0) * 100),
      });

      if (!quotes || quotes.length === 0) {
        throw new Error('No quote available from Mayan');
      }

      // Take the first/best quote
      const quote = quotes[0];
      return this.normalizeRoute(quote, params);
    } catch (error) {
      this.logger.error(`Mayan quote error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async buildTransaction(routeId: string, userWallet: string): Promise<TransactionRequest> {
    try {
      // Mayan transactions require the full quote context
      // In production, retrieve from cache/database
      throw new Error('buildTransaction requires quote data from cache/database');
    } catch (error) {
      this.logger.error(`Mayan build transaction error: ${error.message}`);
      throw error;
    }
  }

  async getStatus(transactionHash: string): Promise<ExecutionStatusUpdate> {
    try {
      // Mayan uses their own status tracking system
      // Would need to integrate with Mayan's status API
      return {
        execution_id: transactionHash,
        status: 'pending',
        transaction_hash: transactionHash,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Mayan status check error: ${error.message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Test with a small quote request
      await fetchQuote({
        amount: 1,
        fromToken: 'So11111111111111111111111111111111111111112', // SOL
        toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
        fromChain: 'solana',
        toChain: 'ethereum',
        slippageBps: 100,
      });

      const responseTime = Date.now() - startTime;

      return {
        provider: this.name,
        is_healthy: true,
        response_time_ms: responseTime,
        last_checked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        provider: this.name,
        is_healthy: false,
        response_time_ms: responseTime,
        last_checked: new Date(),
        error_message: error.message,
      };
    }
  }

  supportsRoute(sourceChain: string, destinationChain: string): boolean {
    return (
      this.supportedChains.includes(sourceChain) &&
      this.supportedChains.includes(destinationChain)
    );
  }

  getLimits(): ProviderLimits {
    return {
      min_amount: '1000',
      max_amount: '10000000000000000000',
      supported_tokens: [],
      rate_limit: {
        requests_per_second: 5,
        requests_per_minute: 50,
      },
    };
  }

  private normalizeRoute(quote: Quote, params: QuoteParams): NormalizedRoute {
    const steps = [
      {
        step_number: 1,
        action: 'bridge' as const,
        protocol: 'mayan',
        from_token: params.source_token,
        to_token: params.destination_token,
        expected_output: quote.expectedAmountOut.toString(),
        estimated_gas: '5000',
        chain: params.source_chain,
      },
    ];

    return {
      route_id: `mayan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'mayan',
      source_chain: params.source_chain,
      destination_chain: params.destination_chain,
      source_token: params.source_token,
      destination_token: params.destination_token,
      input_amount: params.amount,
      output_amount: quote.expectedAmountOut.toString(),
      total_fee: {
        network_fee: '5000',
        bridge_fee: '0',
        protocol_fee: '0',
      },
      estimated_time: quote.eta || 300,
      slippage_tolerance: params.slippage_tolerance || 1.0,
      slippage_risk: 'low',
      reliability_score: 0.92,
      liquidity_score: 0.88,
      steps,
      raw_provider_data: quote,
    };
  }
}
