/**
 * Figma Authentication Service
 * Handles OAuth flow and token management
 */

import { db } from '~/server/db';
import { figmaConnections } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import type { FigmaUser, FigmaOAuthTokens } from '~/lib/types/figma.types';

export class FigmaAuthService {
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;

  constructor() {
    this.clientId = process.env.FIGMA_CLIENT_ID || '';
    this.clientSecret = process.env.FIGMA_CLIENT_SECRET || '';
    this.callbackUrl = process.env.FIGMA_OAUTH_CALLBACK_URL || '';
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'file_read',
      state,
      response_type: 'code',
    });

    return `https://www.figma.com/oauth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<FigmaOAuthTokens> {
    const response = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.callbackUrl,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<FigmaOAuthTokens> {
    const response = await fetch('https://www.figma.com/api/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  }

  /**
   * Get current user info from Figma
   */
  async getCurrentUser(accessToken: string): Promise<FigmaUser> {
    const response = await fetch('https://api.figma.com/v1/me', {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user info: ${error}`);
    }

    return response.json();
  }

  /**
   * Store or update Figma connection in database
   */
  async saveConnection(
    userId: string,
    tokens: FigmaOAuthTokens,
    figmaUser: FigmaUser
  ): Promise<void> {
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Check if connection exists
    const existing = await db
      .select()
      .from(figmaConnections)
      .where(eq(figmaConnections.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      await db
        .update(figmaConnections)
        .set({
          accessToken: this.encryptToken(tokens.access_token),
          refreshToken: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
          expiresAt,
          figmaUserId: figmaUser.id,
          figmaUserEmail: figmaUser.email,
          figmaUserHandle: figmaUser.handle,
          updatedAt: new Date(),
        })
        .where(eq(figmaConnections.userId, userId));
    } else {
      // Create new connection
      await db.insert(figmaConnections).values({
        userId,
        accessToken: this.encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? this.encryptToken(tokens.refresh_token) : null,
        expiresAt,
        figmaUserId: figmaUser.id,
        figmaUserEmail: figmaUser.email,
        figmaUserHandle: figmaUser.handle,
      });
    }
  }

  /**
   * Get user's Figma connection
   */
  async getConnection(userId: string): Promise<any> {
    const connections = await db
      .select()
      .from(figmaConnections)
      .where(eq(figmaConnections.userId, userId))
      .limit(1);

    if (connections.length === 0) {
      return null;
    }

    const connection = connections[0];
    if (!connection) {
      return null;
    }
    
    // Check if token needs refresh
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      if (connection.refreshToken) {
        try {
          const newTokens = await this.refreshAccessToken(
            this.decryptToken(connection.refreshToken)
          );
          
          await this.saveConnection(
            userId,
            newTokens,
            {
              id: connection.figmaUserId,
              email: connection.figmaUserEmail || '',
              handle: connection.figmaUserHandle || '',
            }
          );
          
          // Return updated connection
          return this.getConnection(userId);
        } catch (error) {
          console.error('Failed to refresh token:', error);
          throw new Error('Figma token expired and refresh failed');
        }
      } else {
        throw new Error('Figma token expired and no refresh token available');
      }
    }

    return {
      ...connection,
      accessToken: this.decryptToken(connection.accessToken),
      refreshToken: connection.refreshToken ? this.decryptToken(connection.refreshToken) : null,
    };
  }

  /**
   * Disconnect Figma account
   */
  async disconnect(userId: string): Promise<void> {
    await db
      .delete(figmaConnections)
      .where(eq(figmaConnections.userId, userId));
  }

  /**
   * Validate Personal Access Token
   */
  async validatePAT(token: string): Promise<FigmaUser> {
    try {
      return await this.getCurrentUser(token);
    } catch (error) {
      throw new Error('Invalid Figma Personal Access Token');
    }
  }

  /**
   * Simple token encryption (should use proper encryption in production)
   */
  private encryptToken(token: string): string {
    // In production, use proper encryption with AUTH_SECRET
    const secret = process.env.AUTH_SECRET || 'default-secret';
    // Simple base64 encoding for MVP (use proper encryption in production)
    return Buffer.from(`${secret}:${token}`).toString('base64');
  }

  /**
   * Simple token decryption
   */
  private decryptToken(encryptedToken: string): string {
    // In production, use proper decryption with AUTH_SECRET
    const secret = process.env.AUTH_SECRET || 'default-secret';
    const decoded = Buffer.from(encryptedToken, 'base64').toString();
    return decoded.replace(`${secret}:`, '');
  }
}