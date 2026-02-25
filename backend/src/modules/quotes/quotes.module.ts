/**
 * Quotes Module
 * Handles quote aggregation and route selection
 */

import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  controllers: [QuotesController],
})
export class QuotesModule {}
