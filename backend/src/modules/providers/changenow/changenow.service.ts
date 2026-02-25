/**
 * ChangeNOW Provider Connector
 * CEX-based bridge integration
 */

import { Injectable, Logger, HttpException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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

interface ChangeNowEstimate {
  estimatedAmount: string;
  transactionSpeedForecast: string;
  warningMessage?: string;
}

interface ChangeNowExchange {
  id: string;
  status: string;
  payinAddress: string;
  payoutAddress: string;
  fromCurrency: string;
  toCurrency: string;
  amountExpectedFrom: string;
  amountExpectedTo: string;
}

@Injectable()
export class ChangenowService implements ProviderConnector {
  readonly name = Provider.CHANGENOW;
  readonly supportedChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'binance',
    'solana',
  ];

  private readonly logger = new Logger(ChangenowService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: AppConfigService) {
    const apiKeys = this.configService.getApiKeys();
    this.apiKey = apiKeys.changenow || '';

    this.client = axios.create({
      baseURL: 'https://api.changenow.io/v2',
      timeout: 8000,
      headers: {
        'x-changenow-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async getQuote(params: QuoteParams): Promise<NormalizedRoute> {
    try {
      const fromCurrency = this.mapTokenToCurrency(params.source_token, params.source_chain);
      const toCurrency = this.mapTokenToCurrency(params.destination_token, params.destination_chain);

      const response = await this.client.get<ChangeNowEstimate>(
        `/exchange/estimated-amount`,
        {
          params: {
            fromCurrency,
            toCurrency,
            fromAmount: this.formatAmount(params.amount),
            flow: 'standard',
          },
        },
      );

      if (!response.data || !response.data.estimatedAmount) {
        throw new Error('Invalid response from ChangeNOW');
      }

      return this.normalizeRoute(response.data, params, fromCurrency, toCurrency);
    } catch (error) {
      this.logger.error(`ChangeNOW quote error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async buildTransaction(routeId: string, userWallet: string): Promise<TransactionRequest> {
    try {
      // ChangeNOW requires creating an exchange first
      // This would return the deposit address for the user
      throw new Error('buildTransaction requires creating exchange via ChangeNOW API');
    } catch (error) {
      this.logger.error(`ChangeNOW build transaction error: ${error.message}`);
      throw error;
    }
  }

  async getStatus(transactionHash: string): Promise<ExecutionStatusUpdate> {
    try {
      const response = await this.client.get<ChangeNowExchange>(
        `/exchange/by-id?id=${transactionHash}`,
      );

      return {
        execution_id: transactionHash,
        status: this.mapStatus(response.data.status),
        transaction_hash: transactionHash,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`ChangeNOW status check error: ${error.message}`);
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();
    try {
      // Check available currencies
      await this.client.get('/exchange/currencies?active=true');
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
      min_amount: '10000',
      max_amount: '100000000000000000000',
      supported_tokens: [],
      rate_limit: {
        requests_per_second: 2,
        requests_per_minute: 30,
      },
    };
  }

  private normalizeRoute(
    estimate: ChangeNowEstimate,
    params: QuoteParams,
    fromCurrency: string,
    toCurrency: string,
  ): NormalizedRoute {
    const steps = [
      {
        step_number: 1,
        action: 'bridge' as const,
        protocol: 'changenow',
        from_token: fromCurrency,
        to_token: toCurrency,
        expected_output: estimate.estimatedAmount,
        estimated_gas: '0',
        chain: params.source_chain,
      },
    ];

    return {
      route_id: `changenow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: 'changenow',
      source_chain: params.source_chain,
      destination_chain: params.destination_chain,
      source_token: params.source_token,
      destination_token: params.destination_token,
      input_amount: params.amount,
      output_amount: estimate.estimatedAmount,
      total_fee: {
        network_fee: '0',
        bridge_fee: '0',
        protocol_fee: '0',
      },
      estimated_time: this.parseEstimatedTime(estimate.transactionSpeedForecast),
      slippage_tolerance: params.slippage_tolerance || 1.0,
      slippage_risk: 'medium',
      reliability_score: 0.88,
      liquidity_score: 0.90,
      steps,
      raw_provider_data: estimate,
    };
  }

  private mapStatus(changenowStatus: string): any {
    const statusMap: Record<string, string> = {
      new: 'pending',
      waiting: 'pending',
      confirming: 'confirming',
      exchanging: 'confirming',
      sending: 'confirming',
      finished: 'success',
      failed: 'failed',
      refunded: 'failed',
      expired: 'timeout',
    };
    return statusMap[changenowStatus] || 'pending';
  }

  private mapTokenToCurrency(token: string, chain: string): string {
    // Simple mapping - in production, use a comprehensive token list
    const nativeTokens: Record<string, string> = {
      '0x0000000000000000000000000000000000000000': 'eth',
      'So11111111111111111111111111111111111111112': 'sol',
    };

    return nativeTokens[token] || token.toLowerCase();
  }

  private formatAmount(amount: string): string {
    // Convert from wei/lamports to decimal
    return (parseFloat(amount) / 1e18).toFixed(6);
  }

  private parseEstimatedTime(forecast: string): number {
    // Parse strings like "10-20 minutes" to seconds
    const match = forecast.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]) * 60;
    }
    return 600; // Default 10 minutes
  }
}
