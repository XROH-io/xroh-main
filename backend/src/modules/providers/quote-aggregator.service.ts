/**
 * Quote Aggregator Service
 * Fetches and combines quotes from all providers
 */

import { Injectable, Logger } from '@nestjs/common';
import { LifiService } from './lifi/lifi.service';
import { MayanService } from './mayan/mayan.service';
import { ChangenowService } from './changenow/changenow.service';
import { NormalizedRoute, QuoteParams, ProviderConnector } from '../../common/interfaces';
import { RedisService } from '../../config/redis.service';

interface AggregatedQuoteResult {
  routes: NormalizedRoute[];
  provider_statuses: Record<string, string>;
  total_routes: number;
  response_time_ms: number;
}

@Injectable()
export class QuoteAggregatorService {
  private readonly logger = new Logger(QuoteAggregatorService.name);
  private providers: ProviderConnector[];

  constructor(
    private readonly lifiService: LifiService,
    private readonly mayanService: MayanService,
    private readonly changenowService: ChangenowService,
    private readonly redisService: RedisService,
  ) {
    this.providers = [
      this.lifiService,
      this.mayanService,
      this.changenowService,
    ];
  }

  async aggregateQuotes(params: QuoteParams): Promise<AggregatedQuoteResult> {
    const startTime = Date.now();
    const cacheKey = this.buildCacheKey(params);

    // Check cache first
    const cached = await this.getCachedQuotes(cacheKey);
    if (cached) {
      this.logger.log('Cache hit for quote request');
      return {
        ...cached,
        response_time_ms: Date.now() - startTime,
      };
    }

    // Fetch quotes from all providers in parallel
    const results = await Promise.allSettled(
      this.providers.map((provider) =>
        this.fetchQuoteWithTimeout(provider, params),
      ),
    );

    // Process results
    const routes: NormalizedRoute[] = [];
    const providerStatuses: Record<string, string> = {};

    results.forEach((result, index) => {
      const providerName = this.providers[index].name;

      if (result.status === 'fulfilled' && result.value) {
        routes.push(result.value);
        providerStatuses[providerName] = 'success';
        this.logger.log(`${providerName}: Quote fetched successfully`);
      } else if (result.status === 'rejected') {
        providerStatuses[providerName] = 'failed';
        this.logger.warn(
          `${providerName}: ${result.reason?.message || 'Unknown error'}`,
        );
      }
    });

    // Validate routes
    const validRoutes = routes.filter((route) => this.validateRoute(route));

    // Sort by best output amount
    validRoutes.sort((a, b) => {
      const amountA = BigInt(a.output_amount);
      const amountB = BigInt(b.output_amount);
      return amountA > amountB ? -1 : 1;
    });

    const aggregatedResult: AggregatedQuoteResult = {
      routes: validRoutes,
      provider_statuses: providerStatuses,
      total_routes: validRoutes.length,
      response_time_ms: Date.now() - startTime,
    };

    // Cache the results
    await this.cacheQuotes(cacheKey, aggregatedResult);

    return aggregatedResult;
  }

  private async fetchQuoteWithTimeout(
    provider: ProviderConnector,
    params: QuoteParams,
    timeout: number = 5000,
  ): Promise<NormalizedRoute | null> {
    try {
      // Check if provider supports this route
      if (!provider.supportsRoute(params.source_chain, params.destination_chain)) {
        throw new Error(`Provider ${provider.name} does not support this route`);
      }

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout),
      );

      const quotePromise = provider.getQuote(params);

      return await Promise.race([quotePromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(
        `Provider ${provider.name} failed: ${error.message}`,
      );
      return null;
    }
  }

  private validateRoute(route: NormalizedRoute): boolean {
    try {
      // Sanity checks
      const outputAmount = BigInt(route.output_amount);
      const inputAmount = BigInt(route.input_amount);

      if (outputAmount <= BigInt(0)) {
        this.logger.warn(`Invalid route ${route.route_id}: output amount is zero`);
        return false;
      }

      if (outputAmount > inputAmount * BigInt(2)) {
        this.logger.warn(`Suspicious route ${route.route_id}: output > 2x input`);
        return false;
      }

      if (route.estimated_time > 86400) {
        this.logger.warn(`Route ${route.route_id}: estimated time > 24 hours`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Route validation error: ${error.message}`);
      return false;
    }
  }

  private buildCacheKey(params: QuoteParams): string {
    return `quote:${params.source_chain}:${params.destination_chain}:${params.source_token}:${params.destination_token}:${params.amount}`;
  }

  private async getCachedQuotes(key: string): Promise<AggregatedQuoteResult | null> {
    try {
      const cached = await this.redisService.getJson(key);
      return cached as AggregatedQuoteResult;
    } catch (error) {
      return null;
    }
  }

  private async cacheQuotes(key: string, result: AggregatedQuoteResult): Promise<void> {
    try {
      // Cache for 30 seconds
      await this.redisService.setJson(key, result, 30);
    } catch (error) {
      this.logger.error(`Cache error: ${error.message}`);
    }
  }
}
