/**
 * Strategy Service
 * Manages scoring strategies and custom weights
 */

import { Injectable, Logger } from '@nestjs/common';
import { ScoringWeights, StrategyTemplate, StrategyType } from '../../common/interfaces';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  private readonly predefinedStrategies: Record<StrategyType, StrategyTemplate> = {
    lowest_cost: {
      name: 'Lowest Cost',
      description: 'Prioritizes routes with the lowest fees',
      weights: {
        fee_weight: 0.6,
        speed_weight: 0.1,
        reliability_weight: 0.1,
        slippage_weight: 0.1,
        liquidity_weight: 0.1,
      },
    },
    fast_execution: {
      name: 'Fast Execution',
      description: 'Prioritizes the fastest routes',
      weights: {
        fee_weight: 0.1,
        speed_weight: 0.6,
        reliability_weight: 0.15,
        slippage_weight: 0.1,
        liquidity_weight: 0.05,
      },
    },
    safety_first: {
      name: 'Safety First',
      description: 'Prioritizes the most reliable and low-risk routes',
      weights: {
        fee_weight: 0.05,
        speed_weight: 0.05,
        reliability_weight: 0.5,
        slippage_weight: 0.2,
        liquidity_weight: 0.2,
      },
    },
    portfolio_balanced: {
      name: 'Portfolio Balanced',
      description: 'Balanced approach considering all factors equally',
      weights: {
        fee_weight: 0.2,
        speed_weight: 0.2,
        reliability_weight: 0.2,
        slippage_weight: 0.2,
        liquidity_weight: 0.2,
      },
    },
    custom: {
      name: 'Custom',
      description: 'User-defined custom weights',
      weights: {
        fee_weight: 0.2,
        speed_weight: 0.2,
        reliability_weight: 0.2,
        slippage_weight: 0.2,
        liquidity_weight: 0.2,
      },
    },
  };

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Get strategy weights for a given strategy type
   */
  async getStrategyWeights(
    strategy: StrategyType,
    userWallet?: string,
  ): Promise<ScoringWeights> {
    // If custom strategy, try to load user preferences
    if (strategy === 'custom' && userWallet) {
      const userPrefs = await this.getUserPreferences(userWallet);
      if (userPrefs?.custom_weights) {
        return userPrefs.custom_weights as unknown as ScoringWeights;
      }
    }

    const strategyTemplate = this.predefinedStrategies[strategy];
    if (!strategyTemplate) {
      this.logger.warn(`Unknown strategy: ${strategy}, using balanced`);
      return this.predefinedStrategies.portfolio_balanced.weights;
    }

    return strategyTemplate.weights;
  }

  /**
   * Get all available strategies
   */
  getAllStrategies(): StrategyTemplate[] {
    return Object.values(this.predefinedStrategies);
  }

  /**
   * Get specific strategy template
   */
  getStrategy(strategy: StrategyType): StrategyTemplate | null {
    return this.predefinedStrategies[strategy] || null;
  }

  /**
   * Validate custom weights
   */
  validateWeights(weights: ScoringWeights): boolean {
    const sum =
      weights.fee_weight +
      weights.speed_weight +
      weights.reliability_weight +
      weights.slippage_weight +
      weights.liquidity_weight;

    // Weights must sum to 1.0 (with small tolerance for floating point)
    if (Math.abs(sum - 1.0) > 0.01) {
      this.logger.warn(`Invalid weights sum: ${sum}, expected 1.0`);
      return false;
    }

    // All weights must be non-negative
    const allPositive = Object.values(weights).every((w) => w >= 0 && w <= 1);
    if (!allPositive) {
      this.logger.warn('All weights must be between 0 and 1');
      return false;
    }

    return true;
  }

  /**
   * Save user custom strategy
   */
  async saveUserStrategy(
    userWallet: string,
    weights: ScoringWeights,
  ): Promise<void> {
    if (!this.validateWeights(weights)) {
      throw new Error('Invalid weights configuration');
    }

    await this.prismaService.userPreference.upsert({
      where: { user_wallet: userWallet },
      create: {
        user_wallet: userWallet,
        default_strategy: 'custom',
        custom_weights: weights as any,
      },
      update: {
        default_strategy: 'custom',
        custom_weights: weights as any,
      },
    });

    this.logger.log(`Saved custom strategy for user ${userWallet}`);
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userWallet: string) {
    try {
      return await this.prismaService.userPreference.findUnique({
        where: { user_wallet: userWallet },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch user preferences: ${error.message}`);
      return null;
    }
  }
}
