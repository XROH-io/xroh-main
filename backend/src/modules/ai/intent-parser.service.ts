import { Injectable, Logger } from '@nestjs/common';
import { ParsedIntent, IntentAction } from './interfaces/ai.interfaces';

/**
 * Stage 1 Intent Parser (simple rules-based)
 *
 * For now we DON'T call the LLM here. We just:
 * - Look at the raw user message
 * - Classify the intent into a small set of actions
 * - Extract obvious parameters (token, chains, "all"/percentage)
 *
 * Later we can upgrade this to use Claude with a JSON schema.
 */
@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);

  parse(rawQuery: string): ParsedIntent {
    const q = rawQuery.trim().toLowerCase();

    // Default response for non-bridge questions
    const base: ParsedIntent = {
      action: 'general_question',
      rawQuery,
      constraints: {},
      clarificationNeeded: false,
    };

    if (!q) {
      return { ...base, action: 'unknown' };
    }

    // Detect common bridge / move / consolidate verbs
    const isBridgeLike =
      q.includes('bridge') ||
      q.includes('move') ||
      q.includes('send') ||
      q.includes('transfer') ||
      q.includes('consolidate');

    if (!isBridgeLike) {
      // Not clearly an execution-style request, leave as general question
      return base;
    }

    // Try to extract token symbol (very naive for Stage 1)
    const knownTokens = ['usdc', 'usdt', 'sol', 'eth', 'matic'];
    const detectedToken = knownTokens.find((t) => q.includes(t)) || undefined;

    // Detect "all" / percentage / numeric
    let amountType: ParsedIntent['amountType'] = undefined;
    let amount: string | undefined = undefined;

    if (q.includes('all')) {
      amountType = 'all';
    } else if (q.match(/\b\d{1,3}%\b/)) {
      amountType = 'percentage';
      amount = q.match(/\b\d{1,3}%\b/)?.[0];
    } else {
      const numberMatch = q.match(/\b\d+(\.\d+)?\b/);
      if (numberMatch) {
        amountType = 'exact';
        amount = numberMatch[0];
      }
    }

    // Detect destination chain (very simple)
    const chains = [
      'solana',
      'ethereum',
      'polygon',
      'arbitrum',
      'base',
      'optimism',
      'avalanche',
      'bsc',
    ];
    let destinationChain: string | undefined;
    for (const chain of chains) {
      if (q.includes(`to ${chain}`) || q.includes(`on ${chain}`)) {
        destinationChain = chain;
        break;
      }
    }

    const action: IntentAction = 'bridge';

    const intent: ParsedIntent = {
      action,
      token: detectedToken?.toUpperCase(),
      amount,
      amountType,
      sourceChain: undefined, // Stage 1: we will "auto-detect" in planner
      destinationChain,
      strategy: undefined,
      constraints: {},
      clarificationNeeded: false,
      clarificationQuestion: undefined,
      rawQuery,
    };

    this.logger.debug(`Parsed intent: ${JSON.stringify(intent)}`);
    return intent;
  }
}
