import { Router, Request, Response } from "express";
import ClientService from "../services/client.service";
import OtpService from "../services/otp.service";
import WhatsappService from "../services/whatsapp.service";

const router = Router();

// Client API Key auth middleware
const clientAuth = async (req: Request, res: Response, next: Function) => {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ success: false, message: "No API key provided" });
  }

  const validation = await ClientService.validateApiKey(apiKey);
  if (!validation.valid || !validation.client) {
    return res.status(401).json({ success: false, message: "Invalid API key" });
  }

  // Check IP whitelist if configured
  const client = validation.client;
  const clientData = await ClientService.getClient(client.id);
  if (clientData?.whitelistedIps) {
    const ips = clientData.whitelistedIps.split(",").map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      const clientIp = req.ip || req.socket.remoteAddress || "";
      if (!ips.includes(clientIp) && !ips.includes("*")) {
        return res.status(403).json({ success: false, message: "IP not allowed" });
      }
    }
  }

  (req as any).client = validation.client;
  next();
};

// Apply client auth to all routes
router.use(clientAuth);

// Send OTP - The main API for external clients
router.post("/send-otp", async (req: Request, res: Response) => {
  try {
    const { phone, sessionId } = req.body;
    const clientId = (req as any).client.id;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const result = await OtpService.sendOtp(clientId, phone, ipAddress, sessionId || "default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send direct message (not OTP)
router.post("/send-message", async (req: Request, res: Response) => {
  try {
    const { phone, message, sessionId } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ success: false, message: "Phone and message are required" });
    }

    const result = await WhatsappService.sendMessage(phone, message, sessionId || "default");
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;
    const clientId = (req as any).client.id;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    const result = await OtpService.verifyOtp(clientId, phone, otp);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get client info
router.get("/me", async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).client.id;
    const client = await ClientService.getClient(clientId);
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get WhatsApp connection status
router.get("/whatsapp/status", async (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.sessionId as string) || "default";
    const status = await WhatsappService.getStatus(sessionId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get rate limit info
router.get("/rate-limit", async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).client.id;
    const rateCheck = await ClientService.checkRateLimit(clientId);
    const clientData = (req as any).client;
    res.json({
      success: true,
      data: {
        enabled: clientData.rateLimitEnabled,
        limit: clientData.rateLimit,
        remaining: rateCheck.remaining,
        allowed: rateCheck.allowed
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;