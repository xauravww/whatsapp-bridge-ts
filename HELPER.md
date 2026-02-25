# WhatsApp Bridge System Documentation

Complete guide to replicate the WhatsApp bridge system from QR code scanning to sending messages.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Installation & Setup](#installation--setup)
4. [How It Works - Flow](#how-it-works---flow)
5. [API Endpoints](#api-endpoints)
6. [Code Structure](#code-structure)
7. [Environment Variables](#environment-variables)
8. [Database Schema](#database-schema)
9. [Replication Steps](#replication-steps)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The WhatsApp bridge system uses **Baileys** library to connect to WhatsApp without requiring an official WhatsApp Business API. It provides:

- **QR Code Authentication** - Scan QR to connect
- **Auto-reconnect** - Reconnects on server restart
- **Message Sending** - Send messages to any WhatsApp number
- **AI Bot Integration** - Auto-respond to incoming messages
- **Dual Provider Support** - Baileys (Bridge) or Talkvit (Cloud)

---

## Prerequisites

```bash
# Node.js 18+
# Required packages
npm install @whiskeysockets/baileys@^7.0.0-rc.9
npm install @hapi/boom
npm install axios
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd tvsbackend
npm install @whiskeysockets/baileys@^7.0.0-rc.9
```

### 2. Environment Variables

Create `.env` file:

```env
# For Talkvit (Cloud WhatsApp) - Optional
TALKVIT_API_KEY=your_talkvit_api_key
TALKVIT_COMPANY_UUID=your_company_uuid

# Database (Prisma)
DATABASE_URL=postgresql://...

# Redis (for caching/OTP)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Database Setup

Add to your Prisma schema:

```prisma
// User model additions
model User {
  whatsapp_number      String?  @unique @db.VarChar(20)
  whatsapp_verified    Boolean  @default(false)
  whatsapp_no_history  String[] @default([])
}

// System settings
model SystemSetting {
  key   String @id
  value String?
}
```

### 4. Create Auth Directory

The system automatically creates this directory, but you can pre-create it:

```bash
mkdir -p baileys_auth
```

---

## How It Works - Flow

### Flow 1: Connect WhatsApp (QR Code)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Admin     │────▶│  POST /connect   │────▶│ whatsapp.service│
│  Dashboard  │     │                  │     │   .ts           │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                              ┌────────────────┐
                                              │ makeWASocket   │
                                              │ (Baileys)      │
                                              └────────┬───────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │ Generate QR    │
                                              │ Code           │
                                              └────────┬───────┘
                                                       │
                       ┌───────────────────────────────┘
                       ▼
               ┌───────────────┐
               │ Return QR to  │
               │ Admin UI      │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │ User Scans   │
               │ with Phone   │
               └───────┬───────┘
                       │
                       ▼
               ┌───────────────┐
               │ Connection   │
               │ "open"       │
               └───────────────┘
```

### Flow 2: Send Message

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User/     │────▶│ NotificationSvc  │────▶│ whatsapp.service│
│   System    │     │ .ts              │     │ .ts             │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                              ┌────────────────┐
                                              │ Check Provider │
                                              │ (Bridge/Cloud) │
                                              └────────┬───────┘
                                                       │
                    ┌─────────────────────────────────┘
                    ▼
            ┌───────────────┐
            │ If Bridge:    │
            │ sendViaBaileys│
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Clean phone   │
            │ 10 digits     │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ Format JID    │
            │ 91XXXXXXXXXX  │
            │ @s.whatsapp.net
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │ sock.sendMsg  │
            │ (JID, {text}) │
            └───────────────┘
```

### Flow 3: Receive & Auto-Reply (AI Bot)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WhatsApp  │────▶│ messages.upsert  │────▶│ whatsappBot     │
│   User      │     │ event            │     │ .service.ts     │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
                                              ┌────────────────┐
                                              │ Extract text   │
                                              │ from message   │
                                              └────────┬───────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │ AI Knowledge   │
                                              │ Base Service   │
                                              └────────┬───────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │ Get AI Response│
                                              └────────┬───────┘
                                                       │
                                                       ▼
                                              ┌────────────────┐
                                              │ Send reply     │
                                              │ via sock       │
                                              └────────────────┘
```

---

## API Endpoints

### 1. Send OTP
```
POST /api/v1/whatsapp/send-otp
Body: { "phone": "9053583218" }
Response: { "success": true, "message": "WhatsApp OTP sent successfully" }
```

### 2. Verify OTP
```
POST /api/v1/whatsapp/verify-otp
Body: { "phone": "9053583218", "otp": "123456" }
Response: { "success": true, "verified": true }
```

### 3. Get Provider
```
GET /api/v1/whatsapp/provider
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { "provider": "whatsapp-bridge" } }
```

### 4. Set Provider
```
POST /api/v1/whatsapp/provider
Headers: Authorization: Bearer <token>
Body: { "provider": "whatsapp-bridge" }  // or "cloudwhatsapp"
Response: { "success": true, "message": "WhatsApp provider set to whatsapp-bridge" }
```

### 5. Get Status
```
GET /api/v1/whatsapp/status
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { "provider": "whatsapp-bridge", "bridge": { "connected": true, "phoneNumber": "9053583218" } } }
```

### 6. Connect (Get QR)
```
POST /api/v1/whatsapp/connect
Headers: Authorization: Bearer <token>
Response (QR needed): { "success": false, "qrCode": "<base64_qr>", "message": "Scan QR code to connect" }
Response (Already connected): { "success": true, "message": "WhatsApp is already connected" }
```

### 7. Disconnect
```
POST /api/v1/whatsapp/disconnect
Headers: Authorization: Bearer <token>
Response: { "success": true, "message": "WhatsApp disconnected successfully" }
```

### 8. Send Test Message
```
POST /api/v1/whatsapp/test-message
Headers: Authorization: Bearer <token>
Body: { "phone": "9053583218", "message": "Hello!" }
Response: { "success": true, "message": "Test message sent successfully" }
```

### 9. Bot Status
```
GET /api/v1/whatsapp/bot/status
Headers: Authorization: Bearer <token>
Response: { "success": true, "data": { "enabled": true, "greeting": "Welcome!", "activeConversations": 5 } }
```

### 10. Toggle Bot
```
POST /api/v1/whatsapp/bot/toggle
Headers: Authorization: Bearer <token>
Body: { "enabled": true }
Response: { "success": true, "message": "WhatsApp bot enabled" }
```

---

## Code Structure

### Main Files

```
tvsbackend/src/
├── services/
│   ├── whatsapp.service.ts      # Core WhatsApp connection & messaging
│   ├── whatsappBot.service.ts   # AI Bot for auto-replies
│   └── notification.service.ts  # Sends notifications via WhatsApp
├── controllers/v1/
│   └── whatsapp.controller.ts   # API endpoints
├── routes/v1/
│   └── whatsapp.route.ts        # Route definitions
└── server.ts                    # Auto-connects on startup
```

### Key Classes

#### 1. `WhatsappService` (whatsapp.service.ts)

**Main Methods:**

```typescript
class WhatsappService {
    // Connect via Baileys (gets QR code)
    static async connectBridge(): Promise<{ success: boolean; qrCode?: string; message: string }>
    
    // Disconnect and clear auth
    static async disconnectBridge(): Promise<{ success: boolean; message: string }>
    
    // Get connection status
    static async getBridgeStatus(): Promise<{ connected: boolean; qrCode?: string; phoneNumber?: string }>
    
    // Send message via WhatsApp
    static async sendMessage(phone: string, message: string): Promise<void>
    
    // Send OTP
    static async sendOtp(phone: string, otp: string): Promise<void>
    
    // Auto-reconnect on server start
    static async autoReconnectOnStartup(): Promise<void>
    
    // Get/Set provider
    static async getProvider(): Promise<WhatsAppProvider>
    static async setProvider(provider: WhatsAppProvider): Promise<void>
}
```

#### 2. `WhatsappBotService` (whatsappBot.service.ts)

**Main Methods:**

```typescript
class WhatsappBotService {
    // Handle incoming message & generate AI response
    static async handleIncomingMessage(
        senderJid: string,
        messageText: string,
        senderName?: string
    ): Promise<string | null>
    
    // Enable/disable bot
    static async setEnabled(enabled: boolean): Promise<void>
    static async isEnabled(): Promise<boolean>
    
    // Get/Set greeting message
    static async setGreeting(greeting: string): Promise<void>
    static async getStatus(): Promise<{ enabled: boolean; greeting: string }>
    
    // Clear conversation history
    static clearHistory(phone: string): void
}
```

### Provider Types

```typescript
enum WhatsAppProvider {
    CLOUDWHATSAPP = "cloudwhatsapp",    // Talkvit API
    WHATSAPP_BRIDGE = "whatsapp-bridge" // Baileys (Self-hosted)
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TALKVIT_API_KEY` | No | API key for Talkvit (cloud WhatsApp) |
| `TALKVIT_COMPANY_UUID` | No | Company UUID for Talkvit |
| `REDIS_HOST` | Yes | Redis host for OTP caching |
| `REDIS_PORT` | Yes | Redis port (default: 6379) |
| `DATABASE_URL` | Yes | PostgreSQL database URL |
| `NODE_ENV` | No | Set to "development" to see OTPs in response |

---

## Database Schema

### Prisma Schema Additions

```prisma
// In User model
model User {
  id                  Int       @id @default(autoincrement())
  email               String    @unique
  whatsapp_number     String?   @unique @db.VarChar(20)
  whatsapp_verified   Boolean   @default(false)
  whatsapp_no_history String[]  @default([])
  
  @@index([whatsapp_number])
}

// System settings for WhatsApp configuration
model SystemSetting {
  key   String  @id
  value String?
}
```

### Required System Settings

The system stores these settings in `SystemSetting` table:

| Key | Values | Description |
|-----|--------|-------------|
| `WHATSAPP_PROVIDER` | `cloudwhatsapp` or `whatsapp-bridge` | Which provider to use |
| `WHATSAPP_BRIDGE_HOST` | Hostname | For bridge config (legacy) |
| `WHATSAPP_BRIDGE_PORT` | Port | For bridge config (legacy) |
| `WHATSAPP_BOT_ENABLED` | `true` or `false` | Enable/disable AI bot |
| `WHATSAPP_BOT_GREETING` | Text | Custom greeting message |

---

## Replication Steps

### Step 1: Create Project & Install Dependencies

```bash
# Create new Node.js project
mkdir whatsapp-bridge && cd whatsapp-bridge
npm init -y

# Install dependencies
npm install express typescript @types/node @whiskeysockets/baileys@^7.0.0-rc.9 @hapi/boom axios
npm install -D ts-node nodemon
```

### Step 2: Set Up TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

### Step 3: Create WhatsApp Service

Create `src/whatsapp.service.ts`:

```typescript
import makeWASocket, { Browsers, useMultiFileAuthState, WASocket } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as fs from "fs";
import * as path from "path";

const BAILEYS_AUTH_DIR = path.join(process.cwd(), "baileys_auth");

let isWaConnected = false;
let currentQrCode: string | null = null;
let connectedPhoneNumber: string | null = null;
let sock: WASocket | null = null;

export class WhatsappService {
    
    private static async getSocket(): Promise<WASocket> {
        if (sock) return sock;
        
        if (!fs.existsSync(BAILEYS_AUTH_DIR)) {
            fs.mkdirSync(BAILEYS_AUTH_DIR, { recursive: true });
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(BAILEYS_AUTH_DIR);
        
        sock = makeWASocket({
            auth: state,
            browser: Browsers.ubuntu("WhatsApp Bridge"),
            printQRInTerminal: false,
            qrTimeout: 60000,
        });
        
        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr && !isWaConnected) {
                currentQrCode = qr;
                console.log("📱 QR Code received:", qr);
            }
            
            if (connection === "close") {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== 401; // 401 = logged out
                
                isWaConnected = false;
                sock = null;
                currentQrCode = null;
                
                if (shouldReconnect) {
                    setTimeout(() => this.getSocket(), 5000);
                }
            } else if (connection === "open") {
                isWaConnected = true;
                currentQrCode = null;
                connectedPhoneNumber = sock?.user?.id?.split(":")[0].split("@")[0] || null;
                console.log("✅ WhatsApp connected:", connectedPhoneNumber);
            }
        });
        
        sock.ev.on("creds.update", saveCreds);
        
        return sock;
    }
    
    static async connect(): Promise<{ qrCode?: string; success: boolean; message: string }> {
        try {
            if (isWaConnected) {
                return { success: true, message: "Already connected" };
            }
            
            await this.getSocket();
            
            // Wait for QR (max 10 seconds)
            let attempts = 0;
            while (!currentQrCode && attempts < 20) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            
            if (currentQrCode) {
                return { qrCode: currentQrCode, success: false, message: "Scan QR code" };
            }
            
            return { success: true, message: "Connected" };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }
    
    static async sendMessage(phone: string, message: string): Promise<void> {
        if (!isWaConnected || !sock) {
            throw new Error("WhatsApp not connected");
        }
        
        // Clean phone: 10 digits → 91XXXXXXXXXX
        const cleanPhone = phone.replace(/\D/g, "");
        const jid = `${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}@s.whatsapp.net`;
        
        await sock.sendMessage(jid, { text: message });
        console.log("✅ Message sent to", jid);
    }
    
    static async getStatus(): Promise<{ connected: boolean; phoneNumber?: string; qrCode?: string }> {
        return {
            connected: isWaConnected,
            phoneNumber: connectedPhoneNumber || undefined,
            qrCode: currentQrCode || undefined
        };
    }
    
    static async disconnect(): Promise<void> {
        if (sock) {
            sock.end(undefined);
            sock = null;
        }
        isWaConnected = false;
        connectedPhoneNumber = null;
        currentQrCode = null;
        
        // Clear auth
        if (fs.existsSync(BAILEYS_AUTH_DIR)) {
            fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true, force: true });
        }
    }
}
```

### Step 4: Create Express Server

Create `src/server.ts`:

```typescript
import express from "express";
import { WhatsappService } from "./whatsapp.service";

const app = express();
app.use(express.json());

// Connect endpoint
app.post("/whatsapp/connect", async (req, res) => {
    const result = await WhatsappService.connect();
    res.json(result);
});

// Status endpoint
app.get("/whatsapp/status", async (req, res) => {
    const status = await WhatsappService.getStatus();
    res.json(status);
});

// Send message endpoint
app.post("/whatsapp/send", async (req, res) => {
    const { phone, message } = req.body;
    try {
        await WhatsappService.sendMessage(phone, message);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Disconnect endpoint
app.post("/whatsapp/disconnect", async (req, res) => {
    await WhatsappService.disconnect();
    res.json({ success: true, message: "Disconnected" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

### Step 5: Run the Server

```bash
# Start the server
npm run dev

# Or build and run
npx tsc && node dist/server.js
```

### Step 6: Connect WhatsApp

1. **Start server**: `npm run dev`
2. **Call connect API**: 
   ```bash
   curl -X POST http://localhost:3000/whatsapp/connect
   ```
3. **Get QR Code**: Response will contain QR code
4. **Scan with WhatsApp**: Open WhatsApp → Settings → Linked Devices → Scan QR
5. **Verify**: Call status endpoint to confirm connection

### Step 7: Send Messages

```bash
# Send a message
curl -X POST http://localhost:3000/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "9053583218", "message": "Hello from WhatsApp Bridge!"}'
```

---

## Advanced: Add AI Bot

### Step 1: Install AI Dependencies

```bash
npm install openai
```

### Step 2: Create Bot Service

```typescript
// whatsappBot.service.ts
import { AiKnowledgeBaseService } from "./aiKnowledgeBase.service";

export class WhatsappBotService {
    private static socketRef: any = null;
    
    static setSocket(sock: any) {
        this.socketRef = sock;
    }
    
    static async handleIncomingMessage(senderJid: string, text: string, senderName?: string) {
        // Get AI response
        const result = await AiKnowledgeBaseService.queryWithAI(text);
        
        // Send reply
        if (this.socketRef && result.response) {
            await this.socketRef.sendMessage(senderJid, { text: result.response });
        }
        
        return result.response;
    }
}
```

### Step 3: Integrate with WhatsApp Service

In `whatsapp.service.ts`, add message handler:

```typescript
// After creating socket
import { WhatsappBotService } from "./whatsappBot.service";

sock.ev.on("messages.upsert", async (m) => {
    if (m.type !== "notify") return;
    
    for (const msg of m.messages) {
        if (msg.key.fromMe) continue;
        
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
        if (!text) continue;
        
        const jid = msg.key.remoteJid!;
        
        // Process through bot
        await WhatsappBotService.handleIncomingMessage(jid, text, msg.pushName);
    }
});
```

---

## Troubleshooting

### Issue: QR Code Not Generating

**Solution:**
```bash
# Clear auth folder
rm -rf baileys_auth

# Restart server
npm run dev
```

### Issue: "Connection Closed" Loop

**Solution:**
```typescript
// Check disconnect reason
sock.ev.on("connection.update", (update) => {
    console.log("Disconnect reason:", update.lastDisconnect?.error);
});

// If logged out (401), clear auth manually
if (statusCode === 401) {
    fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true });
}
```

### Issue: Messages Not Sending

**Check:**
1. Is WhatsApp connected? (`/status` endpoint)
2. Is phone number correct? (10 digits, no +91)
3. Is recipient in your contacts? (for some WhatsApp versions)

### Issue: Session Not Persisting

**Solution:**
- Ensure `baileys_auth` folder is not in `.gitignore`
- Or use database-backed auth state with `useSingleFileAuthState`

---

## Complete File Summary

| File | Purpose |
|------|---------|
| `whatsapp.service.ts` | Core Baileys connection, QR, messaging |
| `whatsappBot.service.ts` | AI auto-reply bot |
| `whatsapp.controller.ts` | Express API handlers |
| `whatsapp.route.ts` | Route definitions |
| `notification.service.ts` | Uses WhatsApp for notifications |
| `server.ts` | Initializes WhatsApp on startup |

---

## Notes

1. **Session Persistence**: Baileys saves credentials in `baileys_auth/` folder. This allows auto-reconnect on server restart.

2. **Phone Number Format**: 
   - Store: 10 digits (e.g., `9053583218`)
   - Send: Full JID (e.g., `919053583218@s.whatsapp.net`)

3. **Security**: 
   - Keep `baileys_auth/` secure
   - Don't commit credentials to git

4. **Rate Limits**: 
   - WhatsApp may rate-limit if sending too many messages
   - Implement delays between messages

5. **Multi-Device**: 
   - Baileys supports multi-device
   - Phone must stay online for connection

---

## Quick Start Code

```typescript
// Minimal complete example
import makeWASocket, { Browsers, useMultiFileAuthState } from "@whiskeysockets/baileys";
import * as fs from "fs";
import * as path from "path";

const AUTH_DIR = "./baileys_auth";

async function main() {
    // Ensure auth directory
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    
    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    // Create socket
    const sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu("MyApp"),
        printQRInTerminal: true,
    });
    
    // Handle connection
    sock.ev.on("connection.update", (u) => {
        if (u.connection === "open") console.log("✅ Connected!");
        if (u.qr) console.log("📱 Scan:", u.qr);
    });
    
    sock.ev.on("creds.update", saveCreds);
    
    // Send message function
    (global as any).sendWA = async (phone: string, msg: string) => {
        const jid = `91${phone.replace(/\D/g, "")}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: msg });
    };
}

main();
```

---

*Documentation generated from TVS WhatsApp Bridge implementation*