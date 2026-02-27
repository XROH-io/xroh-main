/**
 * Strategy Controller
 * Exposes strategy management endpoints
 */

import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { StrategyService } from './strategy.service';
import { ScoringWeights } from '../../common/interfaces';

class SaveStrategyDto {
  user_wallet: string;
  weights: ScoringWeights;
}

@Controller('strategy')
export class StrategyController {
  private readonly logger = new Logger(StrategyController.name);

  constructor(private readonly strategyService: StrategyService) {}

  @Get()
  getAllStrategies() {
    return {
      strategies: this.strategyService.getAllStrategies(),
    };
  }

  @Get(':strategy')
  getStrategy(@Param('strategy') strategy: string) {
    const strategyTemplate = this.strategyService.getStrategy(strategy as any);

    if (!strategyTemplate) {
      return {
        error: 'Strategy not found',
        available_strategies: [
          'lowest_cost',
          'fast_execution',
          'safety_first',
          'portfolio_balanced',
          'custom',
        ],
      };
    }

    return strategyTemplate;
  }

  @Post('custom')
  async saveCustomStrategy(@Body() dto: SaveStrategyDto) {
    try {
      const isValid = this.strategyService.validateWeights(dto.weights);

      if (!isValid) {
        return {
          success: false,
          error:
            'Invalid weights. Weights must sum to 1.0 and be between 0 and 1',
        };
      }

      await this.strategyService.saveUserStrategy(dto.user_wallet, dto.weights);

      return {
        success: true,
        message: 'Custom strategy saved successfully',
        weights: dto.weights,
      };
    } catch (error) {
      this.logger.error(`Failed to save strategy: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
