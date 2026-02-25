/**
 * Execute Route Request DTO
 * Validates route execution requests from user wallet
 */

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExecuteRouteRequestDto {
  @ApiProperty({
    description: 'Route ID from quote response',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  route_id: string;

  @ApiProperty({
    description: 'User wallet address',
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  })
  @IsString()
  @IsNotEmpty()
  user_wallet: string;

  @ApiPropertyOptional({
    description: 'Override slippage tolerance (percentage)',
    example: 1.5,
    minimum: 0.1,
    maximum: 5.0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0.1)
  @Max(5.0)
  slippage_tolerance?: number;
}
