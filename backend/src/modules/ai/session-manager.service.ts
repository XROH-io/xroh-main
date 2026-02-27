/**
 * Session Manager Service
 * Manages AI agent conversation sessions in Redis
 */

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../config/redis.service';
import { AgentSession, AgentMessage } from './interfaces';
import { randomUUID } from 'crypto';

const SESSION_TTL = 1800; // 30 minutes
const SESSION_PREFIX = 'agent:session:';
const MAX_HISTORY = 40; // Max messages to keep in context

@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Create a new session or retrieve an existing one
   */
  async getOrCreateSession(
    sessionId?: string,
    walletAddress?: string,
  ): Promise<AgentSession> {
    // Try to retrieve existing session
    if (sessionId) {
      const existing = await this.getSession(sessionId);
      if (existing) {
        // Refresh TTL
        await this.redis.set(
          SESSION_PREFIX + sessionId,
          JSON.stringify(existing),
          SESSION_TTL,
        );
        return existing;
      }
    }

    // Create new session
    const newSession: AgentSession = {
      sessionId: sessionId || randomUUID(),
      walletAddress: walletAddress || 'anonymous',
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    await this.saveSession(newSession);
    this.logger.log(`Created new session: ${newSession.sessionId}`);
    return newSession;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<AgentSession | null> {
    const data = await this.redis.getJson<AgentSession>(
      SESSION_PREFIX + sessionId,
    );
    return data;
  }

  /**
   * Add a message to the session and save
   */
  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    session.messages.push(message);
    session.lastActive = new Date();

    // Trim history if too long (keep system prompt + last N messages)
    if (session.messages.length > MAX_HISTORY) {
      const trimCount = session.messages.length - MAX_HISTORY;
      session.messages.splice(0, trimCount);
    }

    await this.saveSession(session);
  }

  /**
   * Get conversation history formatted for Claude API
   */
  getClaudeMessages(
    session: AgentSession,
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return session.messages
      .filter((m: AgentMessage) => m.role === 'user' || m.role === 'assistant')
      .map((m: AgentMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  /**
   * Save session to Redis
   */
  private async saveSession(session: AgentSession): Promise<void> {
    await this.redis.setJson(
      SESSION_PREFIX + session.sessionId,
      session,
      SESSION_TTL,
    );
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(SESSION_PREFIX + sessionId);
    this.logger.log(`Deleted session: ${sessionId}`);
  }
}
