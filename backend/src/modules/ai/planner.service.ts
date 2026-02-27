import { Injectable, Logger } from '@nestjs/common';
import {
  ExecutionPlan,
  ParsedIntent,
  PlanStep,
} from './interfaces/ai.interfaces';

/**
 * Stage 1 Planner (read-only)
 *
 * We DO NOT execute anything here.
 * We just build a human-readable multi-step plan object
 * that explains what the Computer Use agent WOULD do.
 *
 * Later stages will use this plan as input to an Executor.
 */
@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  createPlan(intent: ParsedIntent): ExecutionPlan {
    const now = new Date();
    const planId = `plan_${now.getTime()}`;

    // For Stage 1 we use simple, static estimates and generic steps.
    const steps: PlanStep[] = [];
    let stepNumber = 1;

    // Step 1: Discover balances / chains
    steps.push({
      stepNumber: stepNumber++,
      action: 'discover_balances',
      description:
        'Scan your connected wallets across supported chains to find balances for the requested token.',
      token: intent.token || 'USDC',
      status: 'pending',
    });

    // Step 2: Fetch bridge quotes
    steps.push({
      stepNumber: stepNumber++,
      action: 'fetch_bridge_quotes',
      description:
        'Fetch real-time bridge quotes from LI.FI, Mayan, and ChangeNOW for all relevant source chains to the target chain.',
      provider: 'LI.FI / Mayan / ChangeNOW',
      sourceChain: intent.sourceChain || 'auto-detect',
      destinationChain: intent.destinationChain || 'auto-detect',
      token: intent.token || 'USDC',
      amount:
        intent.amountType === 'all'
          ? 'ALL AVAILABLE'
          : intent.amount || 'to be determined',
      estimatedTime: 5,
      status: 'pending',
      dependsOn: [1],
    });

    // Step 3: Compare routes and choose strategy
    steps.push({
      stepNumber: stepNumber++,
      action: 'compare_routes',
      description:
        'Score and rank all available routes based on fees, time, reliability, and slippage to pick the best strategy.',
      status: 'pending',
      estimatedTime: 5,
      dependsOn: [2],
    });

    // Step 4: Build transaction(s) (simulation only in Stage 1)
    steps.push({
      stepNumber: stepNumber++,
      action: 'prepare_transactions',
      description:
        'Prepare the sequence of bridge transactions that would be needed (one per source chain), including approvals if required. In Stage 1 this is simulation only.',
      status: 'pending',
      estimatedTime: 10,
      dependsOn: [3],
    });

    // Step 5: Present plan for approval (no execution)
    steps.push({
      stepNumber: stepNumber++,
      action: 'present_plan',
      description:
        'Summarize the full plan, estimated fees, times, and final amounts so you can review and decide whether to let the agent execute in later stages.',
      status: 'pending',
      estimatedTime: 5,
      dependsOn: [4],
    });

    const plan: ExecutionPlan = {
      planId,
      steps,
      totalEstimatedCost: 0, // Stage 1: not computing actual cost yet
      totalEstimatedTime: steps.reduce(
        (sum, s) => sum + (s.estimatedTime || 0),
        0,
      ),
      expectedFinalAmount: 'TBD in later stages',
      status: 'draft',
      createdAt: now,
    };

    this.logger.debug(`Created execution plan: ${JSON.stringify(plan)}`);
    return plan;
  }
}
