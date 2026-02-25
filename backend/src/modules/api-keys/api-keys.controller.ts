import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

class CreateApiKeyDto {
  user_wallet: string;
  name?: string;
}

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async createApiKey(@Body() dto: CreateApiKeyDto) {
    return this.apiKeysService.createApiKey(dto.user_wallet, dto.name);
  }

  @Get(':wallet')
  async getUserApiKeys(@Param('wallet') wallet: string) {
    return this.apiKeysService.getUserApiKeys(wallet);
  }

  @Get(':wallet/stats')
  async getUsageStats(@Param('wallet') wallet: string) {
    return this.apiKeysService.getUsageStats(wallet);
  }
}
