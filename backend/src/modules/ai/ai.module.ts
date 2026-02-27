/**
 * AI Module
 * Wires up the AI agent: controller, agent service, session manager, tool executor.
 * Imports ProvidersModule and RoutesModule so tools can access existing services.
 */

import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AgentService } from './agent.service';
import { SessionManagerService } from './session-manager.service';
import { ToolExecutorService } from './tools/tool-executor.service';
import { IntentParserService } from './intent-parser.service';
import { PlannerService } from './planner.service';
import { StateService } from './state.service';
import { ExecutorService } from './executor.service';
import { WalletToolsService } from './wallet-tools.service';
import { ComputerUseController } from './computer-use.controller';
import { SafetyService } from './safety.service';
import { ProvidersModule } from '../providers/providers.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [ProvidersModule, RoutesModule],
  controllers: [AiController, ComputerUseController],
  providers: [
    AgentService,
    SessionManagerService,
    ToolExecutorService,
    IntentParserService,
    PlannerService,
    StateService,
    ExecutorService,
    WalletToolsService,
    SafetyService,
  ],
  exports: [AgentService],
})
export class AiModule {}
