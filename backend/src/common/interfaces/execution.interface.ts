/**
 * Transaction & Execution Interfaces
 * Defines transaction lifecycle and execution tracking
 */

/**
 * Transaction request for route execution
 */
export interface TransactionRequest {
  route_id: string;
  user_wallet: string;
  chain_id: string;
  slippage_tolerance?: number;
  transaction_data: TransactionData;
}

/**
 * Raw transaction data to be signed
 */
export interface TransactionData {
  to: string;
  data: string;
  value: string;
  gas_limit: string;
  gas_price?: string; // For legacy transactions
  max_fee_per_gas?: string; // For EIP-1559
  max_priority_fee_per_gas?: string; // For EIP-1559
  nonce?: number;
}

/**
 * Execution response after transaction is built
 */
export interface ExecutionResponse {
  execution_id: string;
  route_id: string;
  transaction_data: TransactionData;
  status: ExecutionStatus;
  created_at: Date;
  expires_at: Date;
}

/**
 * Execution status types
 */
export type ExecutionStatus = 
  | 'awaiting_signature'
  | 'pending'
  | 'broadcasting'
  | 'confirming'
  | 'success'
  | 'failed'
  | 'timeout';

/**
 * Status update for ongoing execution
 */
export interface ExecutionStatusUpdate {
  execution_id: string;
  status: ExecutionStatus;
  transaction_hash?: string;
  confirmations?: number;
  block_number?: number;
  estimated_completion?: Date;
  error_message?: string;
  timestamp: Date;
}

/**
 * Complete execution record
 */
export interface ExecutionRecord {
  execution_id: string;
  route_id: string;
  provider: string;
  user_wallet: string;
  
  // Transaction details
  transaction_hash?: string;
  status: ExecutionStatus;
  
  // Expected values (from quote)
  expected_output: string;
  expected_time: number;
  expected_fee: string;
  
  // Actual values (after execution)
  actual_output?: string;
  actual_time?: number;
  actual_fee?: string;
  
  // Timestamps
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  
  // Failure information
  failure_reason?: string;
  failover_attempted?: boolean;
}

/**
 * Signed transaction submission
 */
export interface SignedTransactionSubmission {
  execution_id: string;
  signed_transaction: string;
  signature?: string; // For Solana
}

/**
 * Transaction confirmation data
 */
export interface TransactionConfirmation {
  transaction_hash: string;
  block_number: number;
  confirmations: number;
  status: 'success' | 'failed';
  gas_used?: string;
  effective_gas_price?: string;
}
