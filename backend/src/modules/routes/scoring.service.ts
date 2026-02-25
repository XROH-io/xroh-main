/**
 * Route Scoring Service
 * Calculates scores for routes based on multiple factors
 */

import { Injectable, Logger } from '@nestjs/common';
import { NormalizedRoute, ScoringWeights, RouteScore } from '../../common/interfaces';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Calculate comprehensive score for a route
   */
  async calculateRouteScore(
    route: NormalizedRoute,
    weights: ScoringWeights,
    allRoutes: NormalizedRoute[],
  ): Promise<RouteScore> {
    const feeScore = this.calculateFeeScore(route, allRoutes);
    const speedScore = this.calculateSpeedScore(route, allRoutes);
    const reliabilityScore = await this.calculateReliabilityScore(route);
    const slippageScore = this.calculateSlippageScore(route);
    const liquidityScore = route.liquidity_score;

    const totalScore =
      feeScore * weights.fee_weight +
      speedScore * weights.speed_weight +
      reliabilityScore * weights.reliability_weight +
      slippageScore * weights.slippage_weight +
      liquidityScore * weights.liquidity_weight;

    return {
      route_id: route.route_id,
      fee_score: feeScore,
      speed_score: speedScore,
      reliability_score: reliabilityScore,
      slippage_score: slippageScore,
      liquidity_score: liquidityScore,
      total_score: Math.round(totalScore * 100) / 100,
      explanation: this.generateExplanation(
        route,
        feeScore,
        speedScore,
        reliabilityScore,
        slippageScore,
        liquidityScore,
        totalScore,
        weights,
      ),
    };
  }

  /**
   * Calculate fee score (lower fees = higher score)
   */
  private calculateFeeScore(
    route: NormalizedRoute,
    allRoutes: NormalizedRoute[],
  ): number {
    const fees = allRoutes.map((r) => {
      const networkFee = BigInt(r.total_fee.network_fee || '0');
      const bridgeFee = BigInt(r.total_fee.bridge_fee || '0');
      const protocolFee = BigInt(r.total_fee.protocol_fee || '0');
      return Number(networkFee + bridgeFee + protocolFee);
    });

    const minFee = Math.min(...fees);
    const maxFee = Math.max(...fees);

    if (minFee === maxFee) return 100;

    const routeFee = Number(
      BigInt(route.total_fee.network_fee || '0') +
        BigInt(route.total_fee.bridge_fee || '0') +
        BigInt(route.total_fee.protocol_fee || '0'),
    );

    // Inverse scale: lowest fee gets 100, highest gets 0
    return ((maxFee - routeFee) / (maxFee - minFee)) * 100;
  }

  /**
   * Calculate speed score (faster = higher score)
   */
  private calculateSpeedScore(
    route: NormalizedRoute,
    allRoutes: NormalizedRoute[],
  ): number {
    const times = allRoutes.map((r) => r.estimated_time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    if (minTime === maxTime) return 100;

    // Inverse scale: fastest gets 100, slowest gets 0
    return ((maxTime - route.estimated_time) / (maxTime - minTime)) * 100;
  }

  /**
   * Calculate reliability score from provider metrics
   */
  private async calculateReliabilityScore(
    route: NormalizedRoute,
  ): Promise<number> {
    try {
      const providerMetrics = await this.prismaService.providerReliability.findUnique({
        where: { provider: route.provider },
      });

      if (!providerMetrics) {
        return route.reliability_score;
      }

      // Use success rate as reliability score
      return providerMetrics.success_rate * 100;
    } catch (error) {
      this.logger.warn(`Failed to fetch reliability for ${route.provider}`);
      return route.reliability_score;
    }
  }

  /**
   * Calculate slippage score (lower risk = higher score)
   */
  private calculateSlippageScore(route: NormalizedRoute): number {
    const slippageRiskMap = {
      low: 100,
      medium: 60,
      high: 30,
    };

    return slippageRiskMap[route.slippage_risk] || 50;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    route: NormalizedRoute,
    feeScore: number,
    speedScore: number,
    reliabilityScore: number,
    slippageScore: number,
    liquidityScore: number,
    totalScore: number,
    weights: ScoringWeights,
  ): string {
    const explanations: string[] = [];

    // Fee explanation
    if (weights.fee_weight > 0.3) {
      if (feeScore > 80) {
        explanations.push('Very competitive fees');
      } else if (feeScore > 50) {
        explanations.push('Moderate fees');
      } else {
        explanations.push('Higher fees compared to alternatives');
      }
    }

    // Speed explanation
    if (weights.speed_weight > 0.3) {
      if (speedScore > 80) {
        explanations.push('Fast execution time');
      } else if (speedScore > 50) {
        explanations.push('Average execution time');
      } else {
        explanations.push('Slower execution');
      }
    }

    // Reliability explanation
    if (weights.reliability_weight > 0.3) {
      if (reliabilityScore > 90) {
        explanations.push('Highly reliable provider');
      } else if (reliabilityScore > 70) {
        explanations.push('Reliable provider');
      } else {
        explanations.push('Lower reliability history');
      }
    }

    // Slippage explanation
    if (route.slippage_risk === 'low') {
      explanations.push('Low slippage risk');
    } else if (route.slippage_risk === 'medium') {
      explanations.push('Medium slippage risk');
    } else {
      explanations.push('Higher slippage risk');
    }

    return explanations.join('. ');
  }
}
