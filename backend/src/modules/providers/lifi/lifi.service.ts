/**
 * LI.FI Provider Connector
 * Multi-chain bridge aggregator integration
 */

import { Injectable, Logger } from '@nestjs/common';
import { createConfig, getRoutes, Route, RouteOptions } from '@lifi/sdk';
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
export class LifiService implements ProviderConnector {
  readonly name = Provider.LIFI;
  readonly supportedChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'base',
    'binance',
    'avalanche',
    'solana',
  ];

  private readonly logger = new Logger(LifiService.name);

  constructor(private readonly configService: AppConfigService) {
    const apiKeys = this.configService.getApiKeys();
    createConfig({
      integrator: 'XROH',
      apiKey: apiKeys.lifi,
    });
  }

  async getQuote(params: QuoteParams): Promise<NormalizedRoute> {
    try {
      const routeOptions: any = {
        fromChainId: this.getChainId(params.source_chain),
        toChainId: this.getChainId(params.destination_chain),
        fromTokenAddress: params.source_token,
        toTokenAddress: params.destination_token,
        fromAmount: params.amount,
        fromAddress: params.user_wallet || '0x0000000000000000000000000000000000000000',
        options: {
          slippage: params.slippage_tolerance || 0.01,
        },
      };

      const result = await getRoutes(routeOptions);
      
      if (!result.routes || result.routes.length === 0) {
        throw new Error('No routes found from LI.FI');
      }

      // Take the best route (first one)
      const bestRoute = result.routes[0];
      return this.normalizeRoute(bestRoute, params);
    } catch (error) {
      this.logger.error(`LI.FI quote error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async buildTransaction(routeId: string, userWallet: string): Promise<TransactionRequest> {
    try {
      // In production, retrieve route from database using routeId
      // For now, we'll need to re-fetch or use cached route data
      throw new Error('buildTransaction requires route data from cache/database');
    } catch (error) {
      this.logger.error(`LI.FI build transaction error: ${error.message}`);
      throw error;
    }
  }

  async getStatus(transactionHash: string): Promise<ExecutionStatusUpdate> {
    try {
      // LI.FI status tracking would go here
      // For now, return pending status
      return {
        execution_id: transactionHash,
        status: 'pending',
        transaction_hash: transactionHash,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`LI.FI status check error: ${error.message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Simple health check - test API availability
      await getRoutes({
        fromChainId: 1,
        toChainId: 137,
        fromTokenAddress: '0x0000000000000000000000000000000000000000',
        toTokenAddress: '0x0000000000000000000000000000000000000000',
        fromAmount: '1000000000000000000',
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
      max_amount: '1000000000000000000000',
      supported_tokens: [],
      rate_limit: {
        requests_per_second: 10,
        requests_per_minute: 100,
      },
    };
  }

  private normalizeRoute(route: Route, params: QuoteParams): NormalizedRoute {
    const steps = route.steps.map((step, index) => ({
      step_number: index + 1,
      action: 'bridge' as const,
      protocol: 'lifi',
      from_token: step.action.fromToken.address,
      to_token: step.action.toToken.address,
      expected_output: step.estimate.toAmount,
      estimated_gas: step.estimate.gasCosts?.[0]?.amount || '0',
      chain: params.source_chain,
    }));

    const totalFee = route.steps.reduce((acc, step) => {
      const gasCost = step.estimate.gasCosts?.[0]?.amount || '0';
      return acc + BigInt(gasCost);
    }, BigInt(0));

    const estimatedTime = route.steps.reduce(
      (acc, step) => acc + (step.estimate.executionDuration || 60),
      0,
    );

    return {
      route_id: `lifi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'lifi',
      source_chain: params.source_chain,
      destination_chain: params.destination_chain,
      source_token: params.source_token,
      destination_token: params.destination_token,
      input_amount: params.amount,
      output_amount: route.toAmount,
      total_fee: {
        network_fee: totalFee.toString(),
        bridge_fee: '0',
        protocol_fee: '0',
      },
      estimated_time: estimatedTime,
      slippage_tolerance: params.slippage_tolerance || 1.0,
      slippage_risk: this.calculateSlippageRisk(route),
      reliability_score: 0.95,
      liquidity_score: 0.85,
      steps,
      raw_provider_data: route,
    };
  }

  private calculateSlippageRisk(route: Route): 'low' | 'medium' | 'high' {
    // Simple heuristic based on number of steps
    if (route.steps.length === 1) return 'low';
    if (route.steps.length === 2) return 'medium';
    return 'high';
  }

  private mapStatus(lifiStatus: string): any {
    const statusMap: Record<string, string> = {
      NOT_FOUND: 'pending',
      INVALID: 'failed',
      PENDING: 'pending',
      DONE: 'success',
      FAILED: 'failed',
    };
    return statusMap[lifiStatus] || 'pending';
  }

  private getChainId(chain: string): number {
    const chainIds: Record<string, number> = {
      ethereum: 1,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      base: 8453,
      binance: 56,
      avalanche: 43114,
      solana: 1151111081099710,
    };
    return chainIds[chain] || 1;
  }
}
