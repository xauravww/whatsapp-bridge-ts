import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";

export class ClientService {
  static generateApiKey(): string {
    return `wa_${uuidv4().replace(/-/g, "")}`;
  }

  static async createClient(
    name: string,
    rateLimit: number = -1,
    rateLimitEnabled: boolean = false
  ): Promise<{
    id: number;
    name: string;
    apiKey: string;
    secretHash: string;
    rateLimit: number;
    rateLimitEnabled: boolean;
    isActive: boolean;
    clientSecret: string;
  }> {
    const apiKey = this.generateApiKey();
    const secret = this.generateApiKey();
    const secretHash = await bcrypt.hash(secret, 10);

    const client = await prisma.client.create({
      data: {
        name,
        apiKey,
        secretHash,
        rateLimit,
        rateLimitEnabled,
        isActive: true,
      },
    });

    logger.info(`Created client: ${name} with API key: ${apiKey}`);

    return {
      id: client.id,
      name: client.name,
      apiKey: client.apiKey,
      secretHash: client.secretHash,
      rateLimit: client.rateLimit,
      rateLimitEnabled: client.rateLimitEnabled,
      isActive: client.isActive,
      clientSecret: secret,
    };
  }

  static async validateApiKey(apiKey: string): Promise<{
    valid: boolean;
    client?: {
      id: number;
      name: string;
      rateLimit: number;
      rateLimitEnabled: boolean;
      isActive: boolean;
    };
  }> {
    if (!apiKey || !apiKey.startsWith("wa_")) {
      return { valid: false };
    }

    const client = await prisma.client.findUnique({
      where: { apiKey },
    });

    if (!client || !client.isActive) {
      return { valid: false };
    }

    // Update last used
    await prisma.client.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      valid: true,
      client: {
        id: client.id,
        name: client.name,
        rateLimit: client.rateLimit,
        rateLimitEnabled: client.rateLimitEnabled,
        isActive: client.isActive,
      },
    };
  }

  static async getClient(id: number) {
    return prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        apiKey: true,
        rateLimit: true,
        rateLimitEnabled: true,
        isActive: true,
        whitelistedIps: true,
        createdAt: true,
        lastUsedAt: true,
        _count: {
          select: { otpLogs: true },
        },
      },
    });
  }

  static async getAllClients() {
    return prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        apiKey: true,
        rateLimit: true,
        rateLimitEnabled: true,
        isActive: true,
        whitelistedIps: true,
        createdAt: true,
        lastUsedAt: true,
        _count: {
          select: { otpLogs: true },
        },
      },
    });
  }

  static async updateClient(id: number, data: {
    name?: string;
    rateLimit?: number;
    rateLimitEnabled?: boolean;
    isActive?: boolean;
    whitelistedIps?: string;
  }) {
    return prisma.client.update({
      where: { id },
      data,
    });
  }

  static async deleteClient(id: number) {
    return prisma.client.delete({
      where: { id },
    });
  }

  static async regenerateApiKey(id: number): Promise<string> {
    const newApiKey = this.generateApiKey();
    const newSecret = this.generateApiKey();
    const secretHash = await bcrypt.hash(newSecret, 10);

    await prisma.client.update({
      where: { id },
      data: { apiKey: newApiKey, secretHash },
    });

    return newApiKey;
  }

  static async checkRateLimit(clientId: number): Promise<{
    allowed: boolean;
    remaining: number;
  }> {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { rateLimit: true, rateLimitEnabled: true },
    });

    if (!client) {
      return { allowed: false, remaining: 0 };
    }

    // If rate limiting is disabled or set to unlimited
    if (!client.rateLimitEnabled || client.rateLimit === -1) {
      return { allowed: true, remaining: -1 };
    }

    // Get count of OTP requests in last minute
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const count = await prisma.otpLog.count({
      where: {
        clientId,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    const remaining = Math.max(0, client.rateLimit - count);
    return {
      allowed: count < client.rateLimit,
      remaining,
    };
  }
}

export default ClientService;