/**
 * Quotes Module
 * Handles quote aggregation and route selection
 */

import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { ProvidersModule } from '../providers/providers.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [ProvidersModule, RoutesModule],
  controllers: [QuotesController],
})
export class QuotesModule {}
