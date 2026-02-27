import { Injectable, Logger } from '@nestjs/common';
import { Execution } from './interfaces/ai.interfaces';

/**
 * StateService (Stage 2)
 *
 * Minimal in-memory execution state store for simulation.
 * Later this can be moved to Prisma + Redis.
 */
@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);
  private readonly executions = new Map<string, Execution>();

  create(execution: Execution): void {
    this.executions.set(execution.id, execution);
    this.logger.debug(
      `Stored execution ${execution.id} with status ${execution.status}`,
    );
  }

  update(execution: Execution): void {
    if (!this.executions.has(execution.id)) {
      this.logger.warn(
        `Tried to update unknown execution ${execution.id}, creating instead`,
      );
    }
    this.executions.set(execution.id, execution);
  }

  get(id: string): Execution | undefined {
    return this.executions.get(id);
  }
}
