import { Router, Request, Response } from "express";
import AdminService from "../services/admin.service";
import ClientService from "../services/client.service";
import OtpService from "../services/otp.service";
import WhatsappService from "../services/whatsapp.service";

const router = Router();

// Admin login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AdminService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin middleware
const adminAuth = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const validation = await AdminService.validateToken(token);
  if (!validation.valid) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }

  (req as any).admin = validation.admin;
  next();
};

// Apply admin auth to all routes below
router.use(adminAuth);

// Get admin stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await AdminService.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change password
router.post("/change-password", async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await AdminService.changePassword(
      (req as any).admin.id,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Client routes ───────────────────────────────────────

router.get("/clients", async (req: Request, res: Response) => {
  try {
    const clients = await ClientService.getAllClients();
    res.json({ success: true, data: clients });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/clients", async (req: Request, res: Response) => {
  try {
    const { name, rateLimit, rateLimitEnabled } = req.body;
    const client = await ClientService.createClient(name, rateLimit, rateLimitEnabled);
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/clients/:id", async (req: Request, res: Response) => {
  try {
    const client = await ClientService.getClient(parseInt(req.params.id));
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/clients/:id", async (req: Request, res: Response) => {
  try {
    const { name, rateLimit, rateLimitEnabled, isActive, whitelistedIps } = req.body;
    const client = await ClientService.updateClient(parseInt(req.params.id), {
      name,
      rateLimit,
      rateLimitEnabled,
      isActive,
      whitelistedIps,
    });
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/clients/:id", async (req: Request, res: Response) => {
  try {
    await ClientService.deleteClient(parseInt(req.params.id));
    res.json({ success: true, message: "Client deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/clients/:id/regenerate-key", async (req: Request, res: Response) => {
  try {
    const newApiKey = await ClientService.regenerateApiKey(parseInt(req.params.id));
    res.json({ success: true, data: { apiKey: newApiKey } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Session management routes ───────────────────────────

router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const sessions = await WhatsappService.getAllSessions();
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const { sessionId, label } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }
    const result = await WhatsappService.createSession(sessionId, label);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.deleteSession(req.params.sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/sessions/:sessionId/connect", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.connect(req.params.sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/sessions/:sessionId/disconnect", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.disconnect(req.params.sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/sessions/:sessionId/status", async (req: Request, res: Response) => {
  try {
    const status = await WhatsappService.getStatus(req.params.sessionId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/sessions/:sessionId/qrcode", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.getQRCode(req.params.sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/sessions/:sessionId/send", async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    const result = await WhatsappService.sendMessage(phone, message, req.params.sessionId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/sessions/:sessionId/chats", async (req: Request, res: Response) => {
  try {
    const chats = await WhatsappService.getChats(req.params.sessionId);
    res.json({ success: true, data: chats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/sessions/:sessionId/messages", async (req: Request, res: Response) => {
  try {
    const chatId = req.query.chatId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const messages = await WhatsappService.getMessages(req.params.sessionId, chatId, limit);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── Legacy WhatsApp routes (backward compat) ──────────

router.get("/whatsapp/status", async (req: Request, res: Response) => {
  try {
    const status = await WhatsappService.getStatus("default");
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/whatsapp/connect", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.connect("default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/whatsapp/qrcode", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.getQRCode("default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/whatsapp/disconnect", async (req: Request, res: Response) => {
  try {
    const result = await WhatsappService.disconnect("default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/whatsapp/send", async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    const result = await WhatsappService.sendMessage(phone, message, "default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── OTP Logs ────────────────────────────────────────────

router.get("/otp-logs", async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
    const logs = await OtpService.getOtpLogs(clientId);
    res.json({ success: true, data: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;