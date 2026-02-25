import prisma from "../lib/prisma";
import { logger } from "../lib/logger";
import WhatsappService from "./whatsapp.service";
import ClientService from "./client.service";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export class OtpService {
  static async sendOtp(
    clientId: number,
    phone: string,
    ipAddress?: string,
    sessionId: string = "default"
  ): Promise<{
    success: boolean;
    message: string;
    otp?: string;
  }> {
    // Check if the specified session is connected
    if (!WhatsappService.isConnected(sessionId)) {
      return { success: false, message: `WhatsApp session '${sessionId}' not connected` };
    }

    // Check rate limit
    const rateCheck = await ClientService.checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      return { success: false, message: "Rate limit exceeded" };
    }

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      return { success: false, message: "Invalid phone number" };
    }

    const otp = generateOtp();

    // Send OTP via WhatsApp
    const result = await WhatsappService.sendOtp(cleanPhone, otp, sessionId);

    if (result.success) {
      await prisma.otpLog.create({
        data: {
          clientId,
          phone: cleanPhone,
          otp,
          status: "sent",
          ipAddress,
          sessionId,
        },
      });

      logger.info(`OTP sent to ${cleanPhone} by client ${clientId} via session ${sessionId}`);

      if (process.env.NODE_ENV === "development") {
        return { success: true, message: "OTP sent successfully", otp };
      }

      return { success: true, message: "OTP sent successfully" };
    }

    await prisma.otpLog.create({
      data: {
        clientId,
        phone: cleanPhone,
        otp,
        status: "failed",
        ipAddress,
        sessionId,
      },
    });

    return { success: false, message: result.message };
  }

  static async verifyOtp(clientId: number, phone: string, otp: string): Promise<{
    success: boolean;
    verified: boolean;
    message: string;
  }> {
    const cleanPhone = phone.replace(/\D/g, "");
    const tenMinutesAgo = new Date(Date.now() - 600000);

    const otpLog = await prisma.otpLog.findFirst({
      where: {
        clientId,
        phone: cleanPhone,
        createdAt: { gte: tenMinutesAgo },
        status: "sent",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpLog) {
      return { success: false, verified: false, message: "No OTP found or OTP expired" };
    }

    if (otpLog.otp === otp) {
      await prisma.otpLog.update({
        where: { id: otpLog.id },
        data: { status: "verified" },
      });
      return { success: true, verified: true, message: "OTP verified successfully" };
    }

    await prisma.otpLog.update({
      where: { id: otpLog.id },
      data: { status: "failed" },
    });

    return { success: false, verified: false, message: "Invalid OTP" };
  }

  static async getOtpLogs(clientId?: number, limit: number = 50) {
    return prisma.otpLog.findMany({
      where: clientId ? { clientId } : undefined,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    });
  }
}

export default OtpService;
