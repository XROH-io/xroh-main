/**
 * Execution Response DTO
 * Returns transaction data ready for signing
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Transaction data to be signed
 */
export class TransactionDataDto {
  @ApiProperty({ example: '0x1234567890abcdef...' })
  to: string;

  @ApiProperty({ example: '0x...' })
  data: string;

  @ApiProperty({ example: '1000000000' })
  value: string;

  @ApiProperty({ example: '21000' })
  gas_limit: string;

  @ApiPropertyOptional({ example: '50000000000' })
  gas_price?: string;

  @ApiPropertyOptional({ example: '60000000000' })
  max_fee_per_gas?: string;

  @ApiPropertyOptional({ example: '2000000000' })
  max_priority_fee_per_gas?: string;

  @ApiPropertyOptional({ example: 42 })
  nonce?: number;
}

/**
 * Response after building transaction for execution
 */
export class ExecutionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  execution_id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  route_id: string;

  @ApiProperty({ type: TransactionDataDto })
  transaction_data: TransactionDataDto;

  @ApiProperty({ example: 'awaiting_signature' })
  status: string;

  @ApiProperty({ example: '2024-01-20T10:30:00Z' })
  created_at: string;

  @ApiProperty({ example: '2024-01-20T10:35:00Z' })
  expires_at: string;
}
