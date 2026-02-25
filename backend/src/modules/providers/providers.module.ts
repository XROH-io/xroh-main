/**
 * Providers Module
 * Manages all bridge provider integrations
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LifiService } from './lifi/lifi.service';
import { MayanService } from './mayan/mayan.service';
import { ChangenowService } from './changenow/changenow.service';
import { QuoteAggregatorService } from './quote-aggregator.service';
import { ProviderHealthService } from './provider-health.service';
import { AppConfigService } from '../../config/app-config.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AppConfigService,
    LifiService,
    MayanService,
    ChangenowService,
    QuoteAggregatorService,
    ProviderHealthService,
  ],
  exports: [
    LifiService,
    MayanService,
    ChangenowService,
    QuoteAggregatorService,
    ProviderHealthService,
  ],
})
export class ProvidersModule {}
