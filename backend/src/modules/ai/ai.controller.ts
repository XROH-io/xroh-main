/**
 * AI Controller
 * REST endpoint for the XROH AI agent
 */

import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { AgentService } from './agent.service';
import { ChatRequest, AgentResponse } from './interfaces';

class ChatRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  walletAddress?: string;
}

@ApiTags('AI Agent')
@Controller('api/ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Chat with the XROH AI agent',
    description:
      'Send a message to the AI agent. The agent can fetch quotes, compare routes, check prices, and more using real-time data from bridge providers.',
  })
  @ApiBody({ type: ChatRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Agent response with optional tool usage details',
  })
  async chat(@Body() body: ChatRequestDto): Promise<AgentResponse> {
    this.logger.log(
      `Chat request from ${body.walletAddress || 'anonymous'}: "${body.message.substring(0, 100)}"`,
    );

    const request: ChatRequest = {
      message: body.message,
      sessionId: body.sessionId,
      walletAddress: body.walletAddress,
    };

    const startTime = Date.now();
    const response = await this.agentService.chat(request);
    const elapsed = Date.now() - startTime;

    this.logger.log(
      `Agent responded in ${elapsed}ms, tools used: ${response.toolsUsed?.length || 0}`,
    );

    return response;
  }
}
