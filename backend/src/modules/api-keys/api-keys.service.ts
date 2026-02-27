import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key for a user
   */
  async createApiKey(userWallet: string, name: string = 'Default Key') {
    // Generate a secure random string
    const randomString = crypto.randomBytes(32).toString('hex');
    const key = `sk-${randomString}`;

    const apiKey = await this.prisma.apiKey.create({
      data: {
        user_wallet: userWallet,
        key,
        name,
        available_requests: 10000, // Default starting requests
      },
    });

    this.logger.log(`Created new API key for wallet: ${userWallet}`);
    return apiKey;
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userWallet: string) {
    return this.prisma.apiKey.findMany({
      where: { user_wallet: userWallet },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Get usage statistics for a user's API keys (for graphs)
   */
  async getUsageStats(userWallet: string) {
    const keys = await this.getUserApiKeys(userWallet);
    const keyIds = keys.map((k) => k.id);

    if (keyIds.length === 0) {
      return [];
    }

    // Get usage for the last 7 days grouped by day
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const usage = await this.prisma.apiUsage.groupBy({
      by: ['created_at'],
      where: {
        api_key_id: { in: keyIds },
        created_at: { gte: sevenDaysAgo },
      },
      _count: {
        id: true,
      },
    });

    // Format for Recharts
    return usage.map((u) => ({
      date: u.created_at.toISOString().split('T')[0],
      calls: u._count.id,
    }));
  }

  /**
   * Validate an API key and decrement available requests
   */
  async validateAndUseKey(key: string, endpoint: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key },
    });

    if (!apiKey || !apiKey.is_active) {
      throw new NotFoundException('Invalid or inactive API key');
    }

    if (apiKey.available_requests <= 0) {
      throw new Error('API key has no available requests left');
    }

    // Update usage in a transaction
    await this.prisma.$transaction([
      this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: {
          total_calls: { increment: 1 },
          available_requests: { decrement: 1 },
        },
      }),
      this.prisma.apiUsage.create({
        data: {
          api_key_id: apiKey.id,
          endpoint,
          status: 200,
          latency_ms: Math.floor(Math.random() * 100) + 50, // Mock latency for now
        },
      }),
    ]);

    return true;
  }
}
