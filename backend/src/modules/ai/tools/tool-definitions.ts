/**
 * Agent Tool Definitions
 * Claude function-calling tool schemas for the XROH agent
 */

import Anthropic from '@anthropic-ai/sdk';

type ToolDefinition = Anthropic.Tool;

export const AGENT_TOOLS: ToolDefinition[] = [
  // ─── Read-Only Tools ──────────────────────────────────────────────────

  {
    name: 'get_supported_chains',
    description:
      'Get the list of all blockchain networks supported by XROH for bridging and swapping. Returns chain names and supported tokens on each chain.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_supported_tokens',
    description:
      'Get the list of all tokens supported by XROH. Optionally filter by a specific chain. Returns token symbols, names, and chain availability.',
    input_schema: {
      type: 'object' as const,
      properties: {
        chain: {
          type: 'string',
          description:
            'Optional chain to filter tokens by (e.g., "solana", "ethereum", "polygon").',
        },
      },
      required: [],
    },
  },

  {
    name: 'fetch_bridge_quotes',
    description:
      'Fetch a live bridge/swap quote from ChangeNOW. Returns the output amount, estimated time, and reliability score. Use this when the user asks to bridge or swap tokens.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source_chain: {
          type: 'string',
          description:
            'Source blockchain (e.g., "solana", "ethereum", "polygon", "arbitrum", "base", "avalanche", "bsc", "optimism").',
        },
        destination_chain: {
          type: 'string',
          description: 'Destination blockchain.',
        },
        source_token: {
          type: 'string',
          description:
            'Source token address or symbol (e.g., "USDC", "SOL", "ETH"). Use contract address when available.',
        },
        destination_token: {
          type: 'string',
          description: 'Destination token address or symbol.',
        },
        amount: {
          type: 'string',
          description:
            'Amount to bridge in human-readable format (e.g., "100" for 100 USDC).',
        },
        slippage_tolerance: {
          type: 'number',
          description:
            'Slippage tolerance as a decimal (e.g., 0.01 for 1%). Defaults to 0.5%.',
        },
      },
      required: [
        'source_chain',
        'destination_chain',
        'source_token',
        'destination_token',
        'amount',
      ],
    },
  },

  {
    name: 'get_token_prices',
    description:
      'Get real-time USD prices for tokens from CoinGecko. Use this to calculate portfolio values or show price information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        token_ids: {
          type: 'string',
          description:
            'Comma-separated CoinGecko token IDs (e.g., "solana,ethereum,usd-coin,matic-network").',
        },
      },
      required: ['token_ids'],
    },
  },

  {
    name: 'check_provider_health',
    description:
      'Check the current health status of the ChangeNOW provider. Shows if ChangeNOW is online and its response time.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'compare_routes',
    description:
      'Get the ChangeNOW bridge quote with scoring details for a token pair. Returns output amount, estimated time, and reliability score. Use this when the user wants to compare or evaluate a route.',
    input_schema: {
      type: 'object' as const,
      properties: {
        source_chain: {
          type: 'string',
          description: 'Source blockchain.',
        },
        destination_chain: {
          type: 'string',
          description: 'Destination blockchain.',
        },
        source_token: {
          type: 'string',
          description: 'Source token address or symbol.',
        },
        destination_token: {
          type: 'string',
          description: 'Destination token address or symbol.',
        },
        amount: {
          type: 'string',
          description: 'Amount to bridge.',
        },
        strategy: {
          type: 'string',
          description:
            'Scoring strategy: "lowest_cost", "fast_execution", "safety_first", "portfolio_balanced". Defaults to "portfolio_balanced".',
        },
      },
      required: [
        'source_chain',
        'destination_chain',
        'source_token',
        'destination_token',
        'amount',
      ],
    },
  },

  // ─── Execution Tools (Phase 2) ───────────────────────────────────────

  {
    name: 'prepare_bridge_transaction',
    description:
      'Prepare a bridge transaction for the user to sign. This builds the unsigned transaction data and returns it. The user must approve and sign it in their wallet. Use this ONLY after the user has explicitly approved a plan or confirmed they want to proceed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        route_id: {
          type: 'string',
          description:
            'The route_id from a previous fetch_bridge_quotes result.',
        },
        user_wallet: {
          type: 'string',
          description: "The user's wallet address for this chain.",
        },
      },
      required: ['route_id', 'user_wallet'],
    },
  },

  {
    name: 'check_transaction_status',
    description:
      'Check the status of a previously submitted bridge transaction. Returns current status, confirmations, and estimated completion time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        transaction_hash: {
          type: 'string',
          description: 'The transaction hash to check.',
        },
        provider: {
          type: 'string',
          description: 'The provider that was used (lifi, mayan, changenow).',
        },
      },
      required: ['transaction_hash', 'provider'],
    },
  },
];
