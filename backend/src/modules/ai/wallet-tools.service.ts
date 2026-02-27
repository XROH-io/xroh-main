import { Injectable, Logger } from '@nestjs/common';
import { SignRequest, TransactionDescriptor } from './interfaces/ai.interfaces';
import { StateService } from './state.service';

/**
 * WalletToolsService (Stage 3 foundation)
 *
 * Manages sign requests for user wallets.
 * - Backend never sees private keys.
 * - We just describe the transaction that should be signed.
 * - Frontend will fetch pending requests and send back signed transactions.
 */
@Injectable()
export class WalletToolsService {
  private readonly logger = new Logger(WalletToolsService.name);
  private readonly requests = new Map<string, SignRequest>();

  constructor(private readonly stateService: StateService) {}

  createSignRequest(params: {
    executionId: string;
    stepNumber: number;
    walletAddress: string;
    tx: TransactionDescriptor;
  }): SignRequest {
    const now = new Date();
    const id = `sign_${now.getTime()}_${params.stepNumber}`;

    const request: SignRequest = {
      id,
      executionId: params.executionId,
      stepNumber: params.stepNumber,
      walletAddress: params.walletAddress,
      tx: params.tx,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.requests.set(id, request);
    this.logger.log(
      `Created sign request ${id} for execution ${params.executionId} (wallet ${params.walletAddress})`,
    );

    return request;
  }

  listPendingForWallet(walletAddress: string): SignRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.walletAddress === walletAddress && r.status === 'pending',
    );
  }

  get(id: string): SignRequest | undefined {
    return this.requests.get(id);
  }

  complete(id: string, signedTransaction: string): SignRequest | undefined {
    const req = this.requests.get(id);
    if (!req) {
      this.logger.warn(`Tried to complete unknown sign request ${id}`);
      return undefined;
    }
    req.status = 'signed';
    req.signedTransaction = signedTransaction;
    req.updatedAt = new Date();
    this.requests.set(id, req);
    this.logger.log(`Sign request ${id} marked as signed`);
    return req;
  }

  reject(id: string, reason?: string): SignRequest | undefined {
    const req = this.requests.get(id);
    if (!req) {
      this.logger.warn(`Tried to reject unknown sign request ${id}`);
      return undefined;
    }
    req.status = 'rejected';
    req.rejectionReason = reason;
    req.updatedAt = new Date();
    this.requests.set(id, req);
    this.logger.log(`Sign request ${id} rejected: ${reason ?? 'no reason'}`);
    return req;
  }
}
