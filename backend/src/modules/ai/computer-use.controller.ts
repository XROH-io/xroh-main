import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WalletToolsService } from './wallet-tools.service';
import { StateService } from './state.service';

/**
 * ComputerUseController (Stage 3 foundation)
 *
 * Exposes read-only endpoints for the frontend to:
 * - List pending sign requests for the connected wallet
 * - Fetch details of a specific sign request
 *
 * NOTE: Completion of sign requests (sending back signed transactions)
 * will be wired in a later step to avoid accidental mainnet broadcasts.
 */
@Controller('api/computer-use')
export class ComputerUseController {
  constructor(
    private readonly walletTools: WalletToolsService,
    private readonly stateService: StateService,
  ) {}

  @Get('sign-requests')
  listPending(@Query('walletAddress') walletAddress: string) {
    if (!walletAddress) {
      return { requests: [] };
    }
    const requests = this.walletTools.listPendingForWallet(walletAddress);
    return { requests };
  }

  @Get('sign-requests/:id')
  getById(@Param('id') id: string) {
    const req = this.walletTools.get(id);
    if (!req) {
      return { request: null };
    }
    return { request: req };
  }

  @Post('sign-requests/:id/complete')
  complete(
    @Param('id') id: string,
    @Body() body: { signedTransaction: string },
  ) {
    const req = this.walletTools.complete(id, body?.signedTransaction);
    return { request: req };
  }

  @Get('executions/:id')
  getExecution(@Param('id') id: string) {
    const exec = this.stateService.get(id);
    if (!exec) {
      return { execution: null };
    }
    return { execution: exec };
  }
}
