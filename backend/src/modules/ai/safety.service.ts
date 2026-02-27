import { Injectable, Logger } from '@nestjs/common';
import { ExecutionPlan, ParsedIntent } from './interfaces/ai.interfaces';

/**
 * SafetyService
 *
 * Central place for execution safety checks.
 * Stage 3/4: keep logic simple but explicit and extendable.
 */
@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  // Hard defaults; later can be moved to config/env.
  private readonly MAX_USD_PER_TX = 5000;
  private readonly MAX_USD_PER_DAY = 20000;

  validateBeforeExecution(intent: ParsedIntent, plan: ExecutionPlan): void {
    // Example: block obviously unsafe "all" without destination chain
    if (
      intent.action === 'bridge' &&
      intent.amountType === 'all' &&
      !intent.destinationChain
    ) {
      throw new Error(
        'For safety, bridging ALL funds requires a specific destination chain. Please specify the destination chain.',
      );
    }

    // Placeholder: here you could call a pricing service to estimate total USD.
    // For now we only log that no strict amount check was done.
    this.logger.debug(
      `Safety check passed for plan ${plan.planId} (no USD cap enforcement yet).`,
    );
  }
}
