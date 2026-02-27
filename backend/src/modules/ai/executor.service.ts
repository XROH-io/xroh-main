import { Injectable, Logger } from '@nestjs/common';
import {
  Execution,
  ExecutionPlan,
  PlanStep,
  ParsedIntent,
  TransactionDescriptor,
} from './interfaces/ai.interfaces';
import { StateService } from './state.service';
import { WalletToolsService } from './wallet-tools.service';
import { SafetyService } from './safety.service';

/**
 * ExecutorService
 *
 * - simulatePlan: Stage 2 dry-run (no real txs)
 * - executePlan:  Stage 3/4 skeleton that creates sign-requests for real execution
 */
@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    private readonly stateService: StateService,
    private readonly walletTools: WalletToolsService,
    private readonly safety: SafetyService,
  ) {}

  simulatePlan(plan: ExecutionPlan, walletAddress: string): Execution {
    const now = new Date();
    const executionId = `exec_${now.getTime()}`;

    // Deep-clone plan to avoid mutating original reference
    const clonedSteps: PlanStep[] = plan.steps.map((step) => ({
      ...step,
      status: 'pending',
      transactionHash: undefined,
    }));

    const clonedPlan: ExecutionPlan = {
      ...plan,
      steps: clonedSteps,
      status: 'executing',
    };

    const execution: Execution = {
      id: executionId,
      walletAddress,
      status: 'simulating',
      createdAt: now,
      updatedAt: now,
      currentStepNumber: 0,
      planSnapshot: clonedPlan,
    };

    this.stateService.create(execution);

    // For Stage 2 we simulate all steps synchronously.
    for (const step of clonedSteps) {
      execution.currentStepNumber = step.stepNumber;
      step.status = 'in_progress';
      execution.updatedAt = new Date();
      this.stateService.update(execution);

      // In a real implementation we might wait or perform async work here.

      // Mark as completed and attach a fake transaction hash for bridge-related steps.
      step.status = 'completed';
      if (
        step.action === 'prepare_transactions' ||
        step.action === 'discover_balances' ||
        step.action === 'fetch_bridge_quotes'
      ) {
        step.transactionHash = `0xSIMULATED_${executionId}_${step.stepNumber}`;
      }

      execution.updatedAt = new Date();
      this.stateService.update(execution);
    }

    execution.status = 'completed';
    execution.updatedAt = new Date();
    execution.planSnapshot.status = 'completed';
    this.stateService.update(execution);

    this.logger.debug(
      `Simulation completed for execution ${executionId} with ${clonedSteps.length} steps`,
    );

    return execution;
  }

  /**
   * Execute a plan in "real" mode:
   * - runs safety checks
   * - creates sign-requests for steps that require transactions
   *
   * NOTE: This is a scaffold; actual provider-specific transaction
   * building and broadcasting must be implemented in a dedicated
   * TransactionToolsService to avoid unsafe assumptions.
   */
  executePlan(
    intent: ParsedIntent,
    plan: ExecutionPlan,
    walletAddress: string,
  ): Execution {
    this.safety.validateBeforeExecution(intent, plan);

    const now = new Date();
    const executionId = `exec_${now.getTime()}`;

    const clonedSteps: PlanStep[] = plan.steps.map((step) => ({
      ...step,
      status: 'pending',
      transactionHash: undefined,
    }));

    const clonedPlan: ExecutionPlan = {
      ...plan,
      steps: clonedSteps,
      status: 'executing',
    };

    const execution: Execution = {
      id: executionId,
      walletAddress,
      status: 'executing',
      createdAt: now,
      updatedAt: now,
      currentStepNumber: 0,
      planSnapshot: clonedPlan,
    };

    this.stateService.create(execution);

    for (const step of clonedSteps) {
      execution.currentStepNumber = step.stepNumber;
      step.status = 'in_progress';
      execution.updatedAt = new Date();
      this.stateService.update(execution);

      // For now we only create sign-requests for "prepare_transactions" steps.
      if (step.action === 'prepare_transactions') {
        const tx: TransactionDescriptor = {
          chain: intent.destinationChain || intent.sourceChain || 'unknown',
          to: '0x0000000000000000000000000000000000000000',
          value: '0',
          data: undefined,
          gasLimit: undefined,
          gasPrice: undefined,
          explanation:
            'Placeholder transaction descriptor. Provider-specific transaction building must be implemented before real execution.',
        };

        this.walletTools.createSignRequest({
          executionId,
          stepNumber: step.stepNumber,
          walletAddress,
          tx,
        });
      }

      // Mark step as completed for now (no real on-chain side effects yet).
      step.status = 'completed';
      execution.updatedAt = new Date();
      this.stateService.update(execution);
    }

    execution.status = 'completed';
    execution.updatedAt = new Date();
    execution.planSnapshot.status = 'completed';
    this.stateService.update(execution);

    this.logger.debug(
      `executePlan scaffold completed for execution ${executionId} with ${clonedSteps.length} steps`,
    );

    return execution;
  }
}
