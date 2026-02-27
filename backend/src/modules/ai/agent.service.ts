/**
 * Agent Service
 * Core AI agent loop using Claude with tool-use (function calling).
 * Implements the ReAct pattern: Receive → Think → Act → Observe → Repeat
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { SessionManagerService } from './session-manager.service';
import { ToolExecutorService } from './tools/tool-executor.service';
import { AGENT_TOOLS } from './tools/tool-definitions';
import {
  AgentResponse,
  AgentMessage,
  ToolUseRecord,
  ToolContext,
  ChatRequest,
} from './interfaces';

const SYSTEM_PROMPT = `You are the XROH Agent — an intelligent cross-chain bridge and swap assistant. You help users bridge tokens between blockchains, compare routes, analyze fees, and find the best deals.

PERSONALITY:
- Be concise and direct. No fluff.
- Use plain text. Never use markdown formatting (no **, ##, \`\`, etc.).
- When presenting numbers, be precise (show fees, amounts, times).
- Be proactive — if you can fetch data to answer better, do it.

CAPABILITIES (use your tools):
- Fetch live bridge quotes from 3 providers (LI.FI, Mayan, ChangeNOW)
- Compare routes with multi-factor scoring (fee, speed, reliability, slippage)
- Check provider health status
- Get real-time token prices
- List supported chains and tokens

BEHAVIOR RULES:
1. When a user asks to bridge or swap, ALWAYS call fetch_bridge_quotes or compare_routes first.
2. Present route options clearly: provider, output amount, fee, time, reliability.
3. If a user asks about a chain/token you're unsure about, call get_supported_chains or get_supported_tokens.
4. For price questions, call get_token_prices.
5. If the user provides incomplete info (e.g., no amount), ask for it.
6. For execution requests, explain that autonomous execution is coming soon, but you can find the best route now.
7. Never fabricate data — always use tools to get real information.
8. If a tool fails, explain the error honestly and suggest alternatives.

SUPPORTED CHAINS: Solana, Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BNB Chain.
PROVIDERS: LI.FI, Mayan, ChangeNOW.`;

const MAX_TOOL_ITERATIONS = 8; // Safety limit for tool loops

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private client: Anthropic;

  constructor(
    private readonly configService: ConfigService,
    private readonly sessionManager: SessionManagerService,
    private readonly toolExecutor: ToolExecutorService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log('Anthropic client initialized');
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not set — agent will not function');
    }
  }

  /**
   * Main entry point — process a user message through the agent loop
   */
  async chat(request: ChatRequest): Promise<AgentResponse> {
    if (!this.client) {
      return {
        reply: 'AI agent is not configured. Please set ANTHROPIC_API_KEY.',
        sessionId: request.sessionId || 'none',
        messageType: 'error',
      };
    }

    // Get or create session
    const session = await this.sessionManager.getOrCreateSession(
      request.sessionId,
      request.walletAddress,
    );

    // Add user message to session
    await this.sessionManager.addMessage(session.sessionId, {
      role: 'user',
      content: request.message,
      timestamp: new Date(),
    });

    // Build Claude messages from session history
    const messages = this.sessionManager.getClaudeMessages(session);

    // Ensure session has the latest user message
    if (
      messages.length === 0 ||
      messages[messages.length - 1].content !== request.message
    ) {
      messages.push({ role: 'user', content: request.message });
    }

    // Create tool context
    const toolContext: ToolContext = {
      walletAddress: request.walletAddress || session.walletAddress,
      sessionId: session.sessionId,
    };

    // Run agent loop
    const toolsUsed: ToolUseRecord[] = [];
    let finalReply = '';

    try {
      finalReply = await this.runAgentLoop(
        messages,
        toolContext,
        toolsUsed,
      );
    } catch (error) {
      this.logger.error(`Agent loop error: ${error.message}`);
      finalReply =
        'I encountered an error processing your request. Please try again.';
    }

    // Save assistant response to session
    await this.sessionManager.addMessage(session.sessionId, {
      role: 'assistant',
      content: finalReply,
      timestamp: new Date(),
    });

    return {
      reply: finalReply,
      sessionId: session.sessionId,
      toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      messageType: 'text',
    };
  }

  /**
   * Core agent loop — call Claude, execute tools, feed results back
   */
  private async runAgentLoop(
    messages: Array<{ role: 'user' | 'assistant'; content: any }>,
    toolContext: ToolContext,
    toolsUsed: ToolUseRecord[],
  ): Promise<string> {
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Call Claude with tools
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      });

      // Check if Claude wants to use a tool
      if (response.stop_reason === 'tool_use') {
        // Extract tool use blocks
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
        );
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === 'text',
        );

        // Add assistant's response (with tool_use) to messages
        messages.push({
          role: 'assistant',
          content: response.content as any,
        });

        // Execute each tool and collect results
        const toolResults: Array<{
          type: 'tool_result';
          tool_use_id: string;
          content: string;
        }> = [];

        for (const toolUse of toolUseBlocks) {
          const startTime = Date.now();
          this.logger.log(
            `Agent calling tool: ${toolUse.name} with input: ${JSON.stringify(toolUse.input).substring(0, 200)}`,
          );

          const result = await this.toolExecutor.executeTool(
            toolUse.name,
            toolUse.input,
            toolContext,
          );

          const elapsed = Date.now() - startTime;

          // Record tool usage
          toolsUsed.push({
            toolName: toolUse.name,
            input: toolUse.input,
            output: result,
            executionTime: elapsed,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result.data || { error: result.error }),
          });
        }

        // Add tool results to messages for Claude to process
        messages.push({
          role: 'user',
          content: toolResults as any,
        });

        // Continue loop — Claude will now process the tool results
        continue;
      }

      // Claude returned a final text response (stop_reason === 'end_turn')
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return textContent || 'I processed your request but have no additional response.';
    }

    return 'I reached the maximum number of tool calls. Please try a simpler request.';
  }
}
