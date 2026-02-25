/**
 * Execution Status Response DTO
 * Tracks transaction confirmation and completion status
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecutionStatusResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  execution_id: string;

  @ApiProperty({ example: 'confirming' })
  status: string;

  @ApiPropertyOptional({ example: '0x123abc...' })
  transaction_hash?: string;

  @ApiPropertyOptional({ example: 5 })
  confirmations?: number;

  @ApiPropertyOptional({ example: 12345678 })
  block_number?: number;

  @ApiPropertyOptional({ example: '2024-01-20T10:35:00Z' })
  estimated_completion?: string;

  @ApiPropertyOptional({ example: 'Insufficient gas' })
  error_message?: string;

  @ApiProperty({ example: '2024-01-20T10:32:15Z' })
  timestamp: string;
}
