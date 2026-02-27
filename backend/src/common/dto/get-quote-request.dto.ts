/**
 * Get Quote Request DTO
 * Validates incoming quote requests with slippage and strategy options
 */

import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type { StrategyType } from '../interfaces';

export class GetQuoteRequestDto {
  @ApiProperty({
    description: 'Source blockchain',
    example: 'solana',
  })
  @IsString()
  @IsNotEmpty()
  source_chain: string;

  @ApiProperty({
    description: 'Destination blockchain',
    example: 'ethereum',
  })
  @IsString()
  @IsNotEmpty()
  destination_chain: string;

  @ApiProperty({
    description: 'Source token address',
    example: 'So11111111111111111111111111111111111111112',
  })
  @IsString()
  @IsNotEmpty()
  source_token: string;

  @ApiProperty({
    description: 'Destination token address',
    example: '0x0000000000000000000000000000000000000000',
  })
  @IsString()
  @IsNotEmpty()
  destination_token: string;

  @ApiProperty({
    description: 'Input amount in smallest unit (wei, lamports, etc)',
    example: '1000000000',
  })
  @IsString()
  @IsNotEmpty()
  input_amount: string;

  @ApiPropertyOptional({
    description: 'Maximum slippage tolerance (percentage)',
    example: 1.0,
    minimum: 0.1,
    maximum: 5.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  @Max(5.0)
  slippage_tolerance?: number;

  @ApiPropertyOptional({
    description: 'Scoring strategy to use',
    enum: [
      'lowest_cost',
      'fast_execution',
      'safety_first',
      'portfolio_balanced',
      'custom',
    ],
    example: 'lowest_cost',
  })
  @IsOptional()
  @IsString()
  @IsEnum([
    'lowest_cost',
    'fast_execution',
    'safety_first',
    'portfolio_balanced',
    'custom',
  ])
  strategy?: StrategyType;

  @ApiPropertyOptional({
    description: 'Specific providers to include (comma-separated)',
    example: 'lifi,mayan',
  })
  @IsOptional()
  @IsString()
  providers?: string;

  @ApiPropertyOptional({
    description: 'User wallet address (for preferences)',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsOptional()
  @IsString()
  user_wallet?: string;
}
