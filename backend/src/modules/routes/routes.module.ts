/**
 * Routes Module
 * Handles route scoring and comparison
 */

import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { RouteComparisonService } from './route-comparison.service';
import { StrategyModule } from '../strategy/strategy.module';

@Module({
  imports: [StrategyModule],
  providers: [ScoringService, RouteComparisonService],
  exports: [ScoringService, RouteComparisonService],
})
export class RoutesModule {}
