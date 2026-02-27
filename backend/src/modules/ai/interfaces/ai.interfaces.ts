/**
 * AI Agent Interfaces
 * Defines types for the AI agent system — sessions, tools, plans, and messages
 */

// ─── Session & Conversation ────────────────────────────────────────────

export interface AgentSession {
  sessionId: string;
  walletAddress: string;
  messages: AgentMessage[];
  createdAt: Date;
  lastActive: Date;
  metadata?: Record<string, any>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool_result';
  content: string;
  timestamp: Date;
  toolUse?: ToolUseRecord;
  planCard?: ExecutionPlan;
  approvalRequest?: ApprovalRequest;
}

// ─── Tool System ────────────────────────────────────────────────────────

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute: (input: any, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  walletAddress: string;
  sessionId: string;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  displayMessage?: string; // Human-readable summary for the chat
}

export interface ToolUseRecord {
  toolName: string;
  input: any;
  output: ToolResult;
  executionTime: number;
}

// ─── Intent Parsing ─────────────────────────────────────────────────────

export interface ParsedIntent {
  action: IntentAction;
  token?: string;
  amount?: string;
  amountType?: 'exact' | 'percentage' | 'all';
  sourceChain?: string;
  destinationChain?: string;
  strategy?: string;
  constraints?: IntentConstraints;
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  rawQuery: string;
}

export type IntentAction =
  | 'bridge'
  | 'swap'
  | 'get_quote'
  | 'check_balance'
  | 'analyze_portfolio'
  | 'check_status'
  | 'compare_routes'
  | 'get_recommendation'
  | 'general_question'
  | 'unknown';

export interface IntentConstraints {
  maxFee?: number;
  maxTime?: number; // seconds
  preferredProvider?: string;
  minReliability?: number;
}

// ─── Execution Plans ────────────────────────────────────────────────────

export interface ExecutionPlan {
  planId: string;
  steps: PlanStep[];
  totalEstimatedCost: number;
  totalEstimatedTime: number; // seconds
  expectedFinalAmount: string;
  status:
    | 'draft'
    | 'awaiting_approval'
    | 'approved'
    | 'executing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  createdAt: Date;
}

export interface PlanStep {
  stepNumber: number;
  action: string;
  description: string;
  provider?: string;
  sourceChain?: string;
  destinationChain?: string;
  token?: string;
  amount?: string;
  estimatedFee?: number;
  estimatedTime?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  transactionHash?: string;
  dependsOn?: number[]; // step numbers this depends on
}

// ─── Approval Request ───────────────────────────────────────────────────

export interface ApprovalRequest {
  planId: string;
  summary: string;
  details: PlanStep[];
  totalCost: string;
  totalTime: string;
  expectedOutput: string;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

// ─── Execution State (Stage 2 simulation) ────────────────────────────────

export type ExecutionStatus =
  | 'draft'
  | 'simulating'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Execution {
  id: string;
  walletAddress: string;
  status: ExecutionStatus;
  createdAt: Date;
  updatedAt: Date;
  currentStepNumber?: number;
  planSnapshot: ExecutionPlan;
  error?: string;
}

// ─── Wallet Sign Requests (Stage 3) ───────────────────────────────────────

export type SignRequestStatus = 'pending' | 'signed' | 'rejected' | 'expired';

export interface TransactionDescriptor {
  chain: string; // e.g. 'ethereum', 'solana'
  to: string;
  data?: string; // hex-encoded call data (EVM) or serialized instruction payload
  value?: string; // amount in wei/lamports/etc as string
  gasLimit?: string;
  gasPrice?: string;
  explanation: string; // human-readable explanation for the user
}

export interface SignRequest {
  id: string;
  executionId: string;
  stepNumber: number;
  walletAddress: string;
  tx: TransactionDescriptor;
  status: SignRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  signedTransaction?: string; // serialized signed tx, ready to broadcast
  rejectionReason?: string;
}

// ─── Agent Response ─────────────────────────────────────────────────────

export interface AgentResponse {
  reply: string;
  sessionId: string;
  toolsUsed?: ToolUseRecord[];
  plan?: ExecutionPlan;
  approvalRequest?: ApprovalRequest;
  messageType: 'text' | 'plan' | 'approval' | 'status' | 'error';
}

// ─── Chat Request ───────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  sessionId?: string;
  walletAddress?: string;
}
