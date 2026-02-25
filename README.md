# Bridge • WhatsApp Bridge Admin Panel 2.0

A high-performance, professional WhatsApp bridge system featuring a multi-session admin panel, client API, and chat preview. Built with TypeScript, Express, Prisma, and whatsapp-web.js.

## ✨ Features

- **Professional UI** - Clean, flat dark-themed dashboard (no gradients, mobile-first design)
- **Multi-Session Management** - Run and manage multiple WhatsApp numbers/sessions simultaneously
- **Chat Preview** - WhatsApp-like interface to view message history and recent chats
- **Optional Rate Limiting** - Flexible per-client rate limits (enabled/disabled/unlimited)
- **Direct Messaging API** - Send any text message beyond just OTPs
- **Session Picking** - Specify exactly which connected number sends your messages
- **Telemetry & Logs** - Real-time tracking of message status and client activity
- **Secure Auth** - Admin JWT authentication and Client API key validation

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Database Sync
npx prisma generate
npx prisma db push

# 3. Start Environment
npm run dev
```

Admin Panel: `http://localhost:3009`
Default Login: `admin@whatsapp-bridge.com` / `admin123`

---

## 📡 API Documentation

### Client Authentication
All client requests must include your API key in the headers:
`x-api-key: your_api_key_here`

### 1. Send OTP
Transmits a numeric verification code to the target device.
- **Endpoint**: `POST /api/client/send-otp`
- **Body**: 
```json
{
  "phone": "9123456789",
  "sessionId": "marketing_1"  // Optional: defaults to "default"
}
```

### 2. Direct Message Protocol
Transmits a custom text payload via the specified WhatsApp instance.
- **Endpoint**: `POST /api/client/send-message`
- **Body**: 
```json
{
  "phone": "9123456789",
  "message": "Hello from the Bridge API!",
  "sessionId": "support_num"
}
```

### 3. Verify OTP
Validates a received code against the system record.
- **Endpoint**: `POST /api/client/verify-otp`
- **Body**: 
```json
{
  "phone": "9123456789",
  "otp": "123456"
}
```

---

## 🛠 Management & Architecture

### Multi-Session Setup
1. Navigate to the **Network** tab in the Admin Panel.
2. Create a new session with a unique ID (e.g., `office_main`).
3. Click "Initialize" and scan the QR code.
4. Use this ID in your API calls to route messages through this specific number.

### Rate Limiting
- **Global Toggle**: Per-client, you can enable or disable rate limiting entirely.
- **Flexible Limits**: Set requests-per-minute or use `-1` for unlimited throughput.

### Chat History
The system automatically logs incoming and outgoing messages. View them in real-time using the **Chat Preview** tab, selecting your desired active session.

---

## 📦 Project Structure

```
├── src/
│   ├── services/
│   │   ├── whatsapp.service.ts   # Multi-session logic
│   │   ├── client.service.ts     # Client & API Key management
│   │   └── otp.service.ts        # Verification logic
│   ├── routes/
│   │   ├── admin.routes.ts       # Session & Panel APIs
│   │   └── client.routes.ts      # External Bridge APIs
│   └── server.ts                 # Express & CSP config
├── prisma/
│   └── schema.prisma             # SQLite Schema (Session, Client, MessageLog)
└── public/
    └── index.html                # Professional React SPA
```

---

## 🔒 Security
- Change `JWT_SECRET` and `ADMIN_PASSWORD` in `.env` before production.
- All WhatsApp authentication data is encrypted locally in `wwebjs_auth/`.
- IP Whitelisting is available per client for added security.
