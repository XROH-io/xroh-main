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
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  flow: string;
  transactionSpeedForecast: string;
  warningMessage?: string;
  depositFee?: number;
  withdrawalFee?: number;
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
      const fromCurrency = this.mapTokenToCurrency(
        params.source_token,
        params.source_chain,
      );
      const toCurrency = this.mapTokenToCurrency(
        params.destination_token,
        params.destination_chain,
      );
      const fromNetwork = this.mapChainToNetwork(params.source_chain);
      const toNetwork = this.mapChainToNetwork(params.destination_chain);

      const response = await this.client.get<ChangeNowEstimate>(
        `/exchange/estimated-amount`,
        {
          params: {
            fromCurrency,
            fromNetwork,
            toCurrency,
            toNetwork,
            fromAmount: this.formatAmount(params.amount, params.source_chain),
            flow: 'standard',
          },
        },
      );

      if (!response.data || response.data.toAmount === undefined) {
        this.logger.error(
          `ChangeNOW raw response: ${JSON.stringify(response.data)}`,
        );
        throw new Error('Invalid response from ChangeNOW');
      }

      return this.normalizeRoute(
        response.data,
        params,
        fromCurrency,
        toCurrency,
      );
    } catch (error) {
      this.logger.error(`ChangeNOW quote error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a real exchange on ChangeNOW.
   * Returns the deposit address (payinAddress) where the user must send funds,
   * plus the exchange ID for status tracking.
   */
  async createExchange(params: {
    fromCurrency: string;
    toCurrency: string;
    fromNetwork?: string;
    toNetwork?: string;
    fromAmount: string;
    payoutAddress: string;
  }): Promise<{
    id: string;
    payinAddress: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: string;
    toAmount: string;
    payoutAddress: string;
    status: string;
    validUntil?: string;
  }> {
    const body: Record<string, string> = {
      fromCurrency: params.fromCurrency,
      toCurrency: params.toCurrency,
      fromAmount: params.fromAmount,
      address: params.payoutAddress,
      flow: 'standard',
    };
    if (params.fromNetwork) body.fromNetwork = params.fromNetwork;
    if (params.toNetwork) body.toNetwork = params.toNetwork;

    this.logger.log(
      `Creating ChangeNOW exchange: ${params.fromAmount} ${params.fromCurrency} → ${params.toCurrency} to ${params.payoutAddress}`,
    );

    const response = await this.client.post<{
      id: string;
      status: string;
      payinAddress: string;
      fromCurrency: string;
      toCurrency: string;
      amountExpectedFrom: string;
      amountExpectedTo: string;
      payoutAddress: string;
      validUntil?: string;
    }>('/exchange', body);

    const d = response.data;
    return {
      id: d.id,
      payinAddress: d.payinAddress,
      fromCurrency: d.fromCurrency,
      toCurrency: d.toCurrency,
      fromAmount: d.amountExpectedFrom ?? params.fromAmount,
      toAmount: d.amountExpectedTo ?? '0',
      payoutAddress: d.payoutAddress,
      status: d.status,
      validUntil: d.validUntil,
    };
  }

  async buildTransaction(
    routeId: string,
    userWallet: string,
  ): Promise<TransactionRequest> {
    throw new Error('Use createExchange() for ChangeNOW transactions');
  }

  async getStatus(transactionHash: string): Promise<ExecutionStatusUpdate> {
    const detail = await this.getExchangeDetail(transactionHash);
    return {
      execution_id: transactionHash,
      status: this.mapStatus(detail.status),
      transaction_hash: detail.payoutHash || transactionHash,
      timestamp: new Date(),
    };
  }

  /**
   * Returns full exchange detail including payoutHash (confirmed tx hash)
   * which is populated once the exchange reaches "sending" or "finished" state.
   */
  async getExchangeDetail(exchangeId: string): Promise<{
    id: string;
    status: string;
    payinHash?: string;
    payoutHash?: string;
    fromCurrency: string;
    toCurrency: string;
    fromAmount: string;
    toAmount: string;
    payoutAddress: string;
  }> {
    try {
      const response = await this.client.get<{
        id: string;
        status: string;
        payinHash?: string;
        payoutHash?: string;
        fromCurrency: string;
        toCurrency: string;
        amountFrom?: string;
        amountTo?: string;
        fromAmount?: string;
        toAmount?: string;
        payoutAddress: string;
      }>(`/exchange/by-id?id=${exchangeId}`);

      const d = response.data;
      return {
        id: d.id,
        status: d.status,
        payinHash: d.payinHash,
        payoutHash: d.payoutHash,
        fromCurrency: d.fromCurrency,
        toCurrency: d.toCurrency,
        fromAmount: d.amountFrom ?? d.fromAmount ?? '0',
        toAmount: d.amountTo ?? d.toAmount ?? '0',
        payoutAddress: d.payoutAddress,
      };
    } catch (error) {
      this.logger.error(`ChangeNOW exchange detail error: ${error.message}`);
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
        expected_output: estimate.toAmount.toString(),
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
      output_amount: estimate.toAmount.toString(),
      total_fee: {
        network_fee: '0',
        bridge_fee: '0',
        protocol_fee: '0',
      },
      estimated_time: this.parseEstimatedTime(
        estimate.transactionSpeedForecast,
      ),
      slippage_tolerance: params.slippage_tolerance || 1.0,
      slippage_risk: 'medium',
      reliability_score: 0.88,
      liquidity_score: 0.9,
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

  /**
   * Maps internal chain names to ChangeNOW network identifiers.
   * Required when a currency ticker exists on multiple networks (e.g. usdc on sol, eth, matic…).
   */
  private mapChainToNetwork(chain: string): string {
    const networkMap: Record<string, string> = {
      solana: 'sol',
      ethereum: 'eth',
      polygon: 'matic',
      arbitrum: 'arbitrum',
      binance: 'bsc',
      bsc: 'bsc',
      avalanche: 'avaxc',
      optimism: 'op',
      base: 'base',
    };
    return networkMap[chain.toLowerCase()] ?? chain.toLowerCase();
  }

  private mapTokenToCurrency(token: string, chain: string): string {
    // Comprehensive token → ChangeNOW currency mapping
    const tokenMap: Record<string, string> = {
      // Native tokens (chain-aware for 0x0000...)
      '0x0000000000000000000000000000000000000000':
        chain === 'binance' ? 'bnb' : 'eth',
      So11111111111111111111111111111111111111112: 'sol',
      '0x0000000000000000000000000000000000001010': 'matic',
      // Stablecoins (Solana addresses)
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'usdc',
      Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'usdt',
      // EVM stablecoins / major tokens
      '0x6B175474E89094C44Da98b954EedeAC495271d0F': 'dai',
      '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'wbtc',
      '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'link',
      '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'uni',
      '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': 'aave',
      // Solana ecosystem
      '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'ray',
      JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: 'jup',
      DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 'bonk',
      EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: 'wif',
      // L2 native tokens
      '0x912CE59144191C1204E64559FE8253a0e49E6548': 'arb',
      '0x4200000000000000000000000000000000000042': 'op',
    };

    return tokenMap[token] || token.toLowerCase();
  }

  private formatAmount(amount: string, _chain?: string): string {
    // QuoteParams amounts are already in human-readable format (e.g. "10" = 10 SOL).
    // Pass directly to ChangeNOW — no unit conversion needed.
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return '0';
    return parsed.toString();
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
