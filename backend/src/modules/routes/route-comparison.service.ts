/**
 * Route Comparison Service
 * Compares and ranks routes based on scoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { StrategyService } from '../strategy/strategy.service';
import {
  NormalizedRoute,
  RouteScore,
  RouteComparison,
  StrategyType,
} from '../../common/interfaces';

export interface RankedRoute extends NormalizedRoute {
  score: RouteScore;
  rank: number;
}

@Injectable()
export class RouteComparisonService {
  private readonly logger = new Logger(RouteComparisonService.name);

  constructor(
    private readonly scoringService: ScoringService,
    private readonly strategyService: StrategyService,
  ) {}

  /**
   * Score and rank all routes
   */
  async scoreAndRankRoutes(
    routes: NormalizedRoute[],
    strategy: StrategyType = 'lowest_cost',
    userWallet?: string,
  ): Promise<RankedRoute[]> {
    if (routes.length === 0) {
      return [];
    }

    // Get strategy weights
    const weights = await this.strategyService.getStrategyWeights(
      strategy,
      userWallet,
    );

    this.logger.log(
      `Scoring ${routes.length} routes with strategy: ${strategy}`,
    );

    // Calculate scores for all routes
    const scoredRoutes = await Promise.all(
      routes.map(async (route) => {
        const score = await this.scoringService.calculateRouteScore(
          route,
          weights,
          routes,
        );
        return { ...route, score };
      }),
    );

    // Sort by total score (highest first)
    scoredRoutes.sort((a, b) => b.score.total_score - a.score.total_score);

    // Add ranking
    const rankedRoutes: RankedRoute[] = scoredRoutes.map((route, index) => ({
      ...route,
      rank: index + 1,
    }));

    this.logger.log(
      `Top route: ${rankedRoutes[0].provider} (score: ${rankedRoutes[0].score.total_score})`,
    );

    return rankedRoutes;
  }

  /**
   * Compare routes and provide detailed analysis
   */
  async compareRoutes(routes: NormalizedRoute[]): Promise<RouteComparison> {
    if (routes.length === 0) {
      throw new Error('No routes to compare');
    }

    // Find the cheapest route
    const cheapestRoute = routes.reduce((min, route) => {
      const routeFee = this.getTotalFee(route);
      const minFee = this.getTotalFee(min);
      return routeFee < minFee ? route : min;
    });

    // Find the fastest route
    const fastestRoute = routes.reduce((min, route) =>
      route.estimated_time < min.estimated_time ? route : min,
    );

    // Find the safest route (highest reliability)
    const safestRoute = routes.reduce((max, route) =>
      route.reliability_score > max.reliability_score ? route : max,
    );

    // Calculate savings
    const cheapestFee = this.getTotalFee(cheapestRoute);
    const highestFee = Math.max(...routes.map((r) => this.getTotalFee(r)));
    const savingsVsCheapest = highestFee - cheapestFee;

    // Calculate time difference
    const fastestTime = fastestRoute.estimated_time;
    const slowestTime = Math.max(...routes.map((r) => r.estimated_time));
    const timeDifference = slowestTime - fastestTime;

    return {
      cheapest_route: cheapestRoute,
      fastest_route: fastestRoute,
      safest_route: safestRoute,
      savings_vs_cheapest: savingsVsCheapest,
      time_difference: timeDifference,
    };
  }

  /**
   * Get recommended route based on strategy
   */
  getRecommendedRoute(rankedRoutes: RankedRoute[]): RankedRoute | null {
    return rankedRoutes.length > 0 ? rankedRoutes[0] : null;
  }

  /**
   * Get backup/alternative routes
   */
  getBackupRoutes(rankedRoutes: RankedRoute[], count: number = 2): RankedRoute[] {
    return rankedRoutes.slice(1, count + 1);
  }

  /**
   * Calculate total fee for a route
   */
  private getTotalFee(route: NormalizedRoute): number {
    return Number(
      BigInt(route.total_fee.network_fee || '0') +
        BigInt(route.total_fee.bridge_fee || '0') +
        BigInt(route.total_fee.protocol_fee || '0'),
    );
  }
}
