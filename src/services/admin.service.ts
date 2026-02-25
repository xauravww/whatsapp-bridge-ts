import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { logger } from "../lib/logger";
import { generateToken, verifyToken } from "../lib/auth";

export class AdminService {
  static async initialize(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables");
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.admin.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: "Admin",
        },
      });
      logger.info("Admin user created");
    }
  }

  static async login(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    admin?: { id: number; email: string; name: string };
    message?: string;
  }> {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return { success: false, message: "Invalid credentials" };
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return { success: false, message: "Invalid credentials" };
    }

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      type: "admin",
    });

    return {
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  static async validateToken(token: string): Promise<{
    valid: boolean;
    admin?: { id: number; email: string; name: string };
  }> {
    try {
      const decoded = verifyToken(token);
      if (!decoded || decoded.type !== "admin") {
        return { valid: false };
      }

      const admin = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });

      if (!admin) {
        return { valid: false };
      }

      return {
        valid: true,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      };
    } catch {
      return { valid: false };
    }
  }

  static async changePassword(
    adminId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      return { success: false, message: "Admin not found" };
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      return { success: false, message: "Current password is incorrect" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    return { success: true, message: "Password changed successfully" };
  }

  static async getStats() {
    const [clientCount, otpLogCount, connectedClients] = await Promise.all([
      prisma.client.count(),
      prisma.otpLog.count(),
      prisma.client.count({
        where: { lastUsedAt: { gte: new Date(Date.now() - 3600000) } },
      }),
    ]);

    const recentOtpLogs = await prisma.otpLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    });

    return {
      clientCount,
      otpLogCount,
      connectedClients,
      recentOtpLogs,
    };
  }
}

export default AdminService;