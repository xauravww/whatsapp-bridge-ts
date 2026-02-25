import { Client, LocalAuth, Message } from "whatsapp-web.js";
import * as fs from "fs";
import * as QRCode from "qrcode";
import { logger } from "../lib/logger";
import prisma from "../lib/prisma";

const WWEBJS_AUTH_DIR = process.env.WWEBJS_AUTH_DIR || "./wwebjs_auth";

interface SessionState {
  client: Client;
  connected: boolean;
  connecting: boolean;
  phoneNumber: string | null;
  qrCode: string | null;
  qrImage: string | null;
}

// Persist sessions and connection promises across HMR reloads in development
const globalForWhatsApp = globalThis as unknown as {
  sessions: Map<string, SessionState> | undefined;
  pendingConnections: Map<string, Promise<{ success: boolean; message: string }>> | undefined;
  isInitialized: boolean | undefined;
};

const sessions = globalForWhatsApp.sessions ?? new Map<string, SessionState>();
const pendingConnections = globalForWhatsApp.pendingConnections ?? new Map<string, Promise<{ success: boolean; message: string }>>();

if (process.env.NODE_ENV !== "production") {
  globalForWhatsApp.sessions = sessions;
  globalForWhatsApp.pendingConnections = pendingConnections;
}

class WhatsappService {
  private static get isInitialized(): boolean {
    return !!globalForWhatsApp.isInitialized;
  }

  private static set isInitialized(value: boolean) {
    globalForWhatsApp.isInitialized = value;
  }

  private static getAuthDir(sessionId: string): string {
    return `${WWEBJS_AUTH_DIR}/session-${sessionId}`;
  }

  private static async deleteAuthDir(sessionId: string): Promise<void> {
    const dir = this.getAuthDir(sessionId);
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        logger.info(`🗑️ Deleted old auth directory for session: ${sessionId}`);
      } catch (err) {
        logger.warn(`Could not delete auth directory for session ${sessionId}:`, err);
      }
    }
  }

  private static async createClient(sessionId: string): Promise<Client> {
    // Delete old auth directory to prevent "browser already running" errors
    await this.deleteAuthDir(sessionId);

    const newClient = new Client({
      authStrategy: new LocalAuth({
        clientId: sessionId,
        dataPath: WWEBJS_AUTH_DIR,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
          "--font-render-hinting=none"
        ],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    const state: SessionState = {
      client: newClient,
      connected: false,
      connecting: true,
      phoneNumber: null,
      qrCode: null,
      qrImage: null,
    };

    sessions.set(sessionId, state);

    newClient.on("qr", (qr) => {
      state.qrCode = qr;
      state.qrImage = null;
      logger.info(`📱 QR Code received for session: ${sessionId}`);
    });

    newClient.on("authenticated", () => {
      logger.info(`✅ Session ${sessionId} authenticated`);
    });

    newClient.on("auth_failure", (msg) => {
      logger.error(`❌ Session ${sessionId} auth failed:`, msg);
      state.connected = false;
      state.connecting = false;
    });

    newClient.on("disconnected", (reason) => {
      logger.warn(`Session ${sessionId} disconnected:`, reason);
      state.connected = false;
      state.phoneNumber = null;
      this.updateSessionDb(sessionId, false, null);
    });

    newClient.on("ready", async () => {
      state.connected = true;
      state.connecting = false;
      state.qrCode = null;
      state.qrImage = null;
      const info = newClient.info;
      state.phoneNumber = info?.wid?.user || null;
      logger.info(`✅ Session ${sessionId} connected: ${state.phoneNumber}`);
      await this.updateSessionDb(sessionId, true, state.phoneNumber);
    });

    // Listen for incoming messages and log them
    newClient.on("message", async (msg: Message) => {
      try {
        const contact = await msg.getContact();
        await prisma.messageLog.create({
          data: {
            sessionId,
            chatId: msg.from,
            phone: msg.from.replace("@c.us", "").replace("@g.us", ""),
            contactName: contact?.pushname || contact?.name || null,
            body: msg.body || "",
            fromMe: false,
          },
        });
      } catch (err) {
        logger.error(`Failed to log incoming message for session ${sessionId}:`, err);
      }
    });

    return newClient;
  }

  private static async updateSessionDb(sessionId: string, connected: boolean, phoneNumber: string | null) {
    try {
      await prisma.whatsAppSession.upsert({
        where: { sessionId },
        update: {
          isConnected: connected,
          phoneNumber,
          lastConnectedAt: connected ? new Date() : undefined,
        },
        create: {
          sessionId,
          label: sessionId,
          isConnected: connected,
          phoneNumber,
          lastConnectedAt: connected ? new Date() : null,
        },
      });
    } catch (err) {
      logger.error("Failed to update session DB:", err);
    }
  }

  static async connect(sessionId: string = "default"): Promise<{ success: boolean; message: string }> {
    // Check if a connection is already in progress
    const pending = pendingConnections.get(sessionId);
    if (pending) {
      logger.info(`⏳ Connection already in progress for session: ${sessionId}, waiting...`);
      return pending;
    }

    const connectionPromise = (async () => {
      try {
        const existing = sessions.get(sessionId);
        if (existing?.connected) {
          return { success: true, message: "WhatsApp already connected" };
        }

        if (existing?.connecting) {
          return { success: true, message: "Connection in progress. Check for QR code." };
        }

        if (existing?.client) {
          try {
            await existing.client.destroy();
            // Wait a bit for the OS to release file locks
            await new Promise(r => setTimeout(r, 2000));
          } catch (err) {
            logger.error(`Error destroying client for ${sessionId}:`, err);
          }
        }

        await prisma.whatsAppSession.upsert({
          where: { sessionId },
          update: {},
          create: { sessionId, label: sessionId },
        });

        sessions.delete(sessionId);

        const client = await this.createClient(sessionId);

        // Use a timeout for initialization to avoid hanging indefinitely
        await Promise.race([
          client.initialize(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Client initialization timeout")), 60000))
        ]);

        let attempts = 0;
        const state = sessions.get(sessionId)!;
        while (!state.connected && !state.qrCode && attempts < 15) {
          await new Promise((r) => setTimeout(r, 1000));
          attempts++;
        }

        if (state.connected) {
          return { success: true, message: "WhatsApp connected successfully" };
        }

        return { success: true, message: "Connection initiated. Scan the QR code." };
      } catch (error: any) {
        logger.error(`WhatsApp connect error for ${sessionId}:`, error);
        return { success: false, message: error.message };
      } finally {
        // Always remove the pending promise when done
        pendingConnections.delete(sessionId);
      }
    })();

    pendingConnections.set(sessionId, connectionPromise);
    return connectionPromise;
  }

  static async getQRCode(sessionId: string = "default"): Promise<{ success: boolean; qrCode?: string; message: string }> {
    const state = sessions.get(sessionId);
    if (!state) {
      return { success: false, message: "Session not found. Call connect() first." };
    }

    if (state.qrCode) {
      const qrImage = await QRCode.toDataURL(state.qrCode, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      return { success: true, qrCode: qrImage, message: "QR code available" };
    }

    return { success: false, message: "QR code not yet available." };
  }

  static async disconnect(sessionId: string = "default"): Promise<{ success: boolean; message: string }> {
    try {
      const state = sessions.get(sessionId);
      if (state?.client) {
        state.client.destroy();
      }
      sessions.delete(sessionId);

      // Clean up auth directory for this session
      const authDir = `${WWEBJS_AUTH_DIR}/session-${sessionId}`;
      if (fs.existsSync(authDir)) {
        // Wait a bit for the OS to release file locks before trying to delete
        await new Promise(r => setTimeout(r, 1000));
        try {
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch (err) {
          logger.error(`Failed to delete auth dir for ${sessionId}:`, err);
        }
      }

      await this.updateSessionDb(sessionId, false, null);
      logger.info(`Session ${sessionId} disconnected`);
      return { success: true, message: "WhatsApp disconnected successfully" };
    } catch (error: any) {
      logger.error("Disconnect error:", error);
      return { success: false, message: error.message };
    }
  }

  static async sendMessage(
    phone: string,
    message: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; message: string }> {
    const state = sessions.get(sessionId);
    if (!state?.connected || !state.client) {
      return { success: false, message: `Session '${sessionId}' not connected` };
    }

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;
      const chatId = `${formattedPhone}@c.us`;

      await state.client.sendMessage(chatId, message);

      // Log outgoing message
      try {
        await prisma.messageLog.create({
          data: {
            sessionId,
            chatId,
            phone: formattedPhone,
            body: message,
            fromMe: true,
          },
        });
      } catch (logErr) {
        logger.error("Failed to log sent message:", logErr);
      }

      logger.info(`✅ Message sent via session ${sessionId} to ${chatId}`);
      return { success: true, message: "Message sent successfully" };
    } catch (error: any) {
      logger.error("Send message error:", error);
      return { success: false, message: error.message };
    }
  }

  static async sendOtp(
    phone: string,
    otp: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; message: string }> {
    const message = `Your verification code is: ${otp}. This code expires in 10 minutes.`;
    return this.sendMessage(phone, message, sessionId);
  }

  static async getStatus(sessionId: string = "default"): Promise<{
    connected: boolean;
    phoneNumber?: string;
    qrCode?: string;
  }> {
    const state = sessions.get(sessionId);
    if (!state) {
      return { connected: false };
    }

    if (state.connected) {
      return {
        connected: true,
        phoneNumber: state.phoneNumber || undefined,
      };
    }

    // Generate QR code image
    if (state.qrCode) {
      if (!state.qrImage) {
        try {
          state.qrImage = await QRCode.toDataURL(state.qrCode, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch (error) {
          logger.error("QR generation error:", error);
        }
      }
      return {
        connected: false,
        qrCode: state.qrImage || undefined,
      };
    }

    return { connected: false };
  }

  static async getAllSessions(): Promise<
    Array<{
      sessionId: string;
      label: string;
      connected: boolean;
      phoneNumber: string | null;
    }>
  > {
    const dbSessions = await prisma.whatsAppSession.findMany({
      orderBy: { createdAt: "asc" },
    });

    return dbSessions.map((s) => {
      const live = sessions.get(s.sessionId);
      return {
        sessionId: s.sessionId,
        label: s.label,
        connected: live?.connected || false,
        phoneNumber: live?.phoneNumber || s.phoneNumber,
      };
    });
  }

  static async createSession(sessionId: string, label?: string): Promise<{ success: boolean; message: string }> {
    try {
      const existing = await prisma.whatsAppSession.findUnique({
        where: { sessionId },
      });
      if (existing) {
        return { success: false, message: "Session already exists" };
      }

      await prisma.whatsAppSession.create({
        data: { sessionId, label: label || sessionId },
      });

      sessions.set(sessionId, {
        client: null as any,
        connected: false,
        connecting: false,
        phoneNumber: null,
        qrCode: null,
        qrImage: null,
      });

      return { success: true, message: "Session created" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const dbSessions = await prisma.whatsAppSession.findMany();
    for (const s of dbSessions) {
      if (!sessions.has(s.sessionId)) {
        sessions.set(s.sessionId, {
          client: null as any,
          connected: s.isConnected,
          connecting: false,
          phoneNumber: s.phoneNumber,
          qrCode: null,
          qrImage: null,
        });
      }
    }
    this.isInitialized = true;
    logger.info(`Loaded ${dbSessions.length} sessions from database`);
  }

  static async deleteSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    await this.disconnect(sessionId);
    sessions.delete(sessionId);
    try {
      await prisma.whatsAppSession.delete({ where: { sessionId } });
    } catch { }
    return { success: true, message: "Session deleted" };
  }

  static async getChats(sessionId: string): Promise<any[]> {
    let state = sessions.get(sessionId);

    if (!state?.client) {
      const dbSession = await prisma.whatsAppSession.findUnique({ where: { sessionId } });
      if (dbSession?.isConnected) {
        await this.connect(sessionId);

        state = sessions.get(sessionId);
        let attempts = 0;
        while ((!state?.connected || !state?.client) && attempts < 20) {
          await new Promise(r => setTimeout(r, 1000));
          state = sessions.get(sessionId);
          attempts++;
        }
      }
    }

    if (state?.connected && state.client) {
      try {
        const clientState = await state.client.getState();
        logger.info(`Client state for ${sessionId}: ${clientState}`);

        if (clientState !== 'CONNECTED') {
          logger.warn(`Client not fully connected, state: ${clientState}`);
          return [];
        }

        await new Promise(r => setTimeout(r, 3000));

        const chats = await state.client.getChats();
        return chats.map((chat) => ({
          id: chat.id._serialized,
          name: chat.name,
          phone: chat.id.user,
          lastMessage: chat.lastMessage?.body || null,
          unreadCount: chat.unreadCount,
          timestamp: chat.timestamp ? new Date(chat.timestamp * 1000) : null,
        }));
      } catch (err) {
        logger.error(`Failed to fetch chats for ${sessionId}:`, err);
      }
    }
    return [];
  }

  static async getMessages(
    sessionId: string,
    chatId?: string,
    limit: number = 50
  ): Promise<any[]> {
    const state = sessions.get(sessionId);
    if (state?.connected && state.client && chatId) {
      try {
        const chat = await state.client.getChatById(chatId);
        const liveMessages = await chat.fetchMessages({ limit });
        return liveMessages.map((m) => ({
          id: m.id._serialized,
          sessionId,
          chatId: m.from,
          phone: m.from.replace("@c.us", ""),
          body: m.body,
          fromMe: m.fromMe,
          timestamp: new Date(m.timestamp * 1000),
        }));
      } catch (err) {
        logger.error(`Failed to fetch live messages for ${sessionId}:`, err);
      }
    }

    return prisma.messageLog.findMany({
      where: {
        sessionId,
        ...(chatId ? { chatId } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }


  static isConnected(sessionId: string = "default"): boolean {
    return sessions.get(sessionId)?.connected || false;
  }

  static getPhoneNumber(sessionId: string = "default"): string | null {
    return sessions.get(sessionId)?.phoneNumber || null;
  }
}

export default WhatsappService;