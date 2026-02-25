/**
 * Submit Signed Transaction DTO
 * Validates signed transactions for blockchain submission
 */

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitSignedTransactionDto {
  @ApiProperty({
    description: 'Execution ID from build transaction response',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  execution_id: string;

  @ApiProperty({
    description: 'Signed transaction hex (EVM) or base64 (Solana)',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signed_transaction: string;

  @ApiPropertyOptional({
    description: 'Signature for Solana transactions',
    example: 'base64_encoded_signature',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}
