# VPS Hosting Guide

## Prerequisites

- Ubuntu 24.04 (Noble) VPS
- Root access

## 1. System Updates & Dependencies

```bash
apt-get update && apt-get upgrade -y
```

## 2. Install Node.js (v24)

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
```

## 3. Install Chrome/Puppeteer Dependencies

```bash
apt-get install -y \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2t64 \
  libxshmfence1
```

## 4. Install PM2

```bash
npm install -g pm2
```

## 5. Clone & Setup Project

```bash
git clone <your-repo-url>
cd whatsapp-bridge-ts
npm install
```

## 6. Configure Environment

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
WAHA_URL="http://localhost:8083"
WAHA_SECRET="your-waha-secret"
```

## 7. Setup Database

```bash
npx prisma generate
npx prisma db push
```

## 8. Build Project (Optional - for production)

```bash
npm run build
```

## 9. Run with PM2

```bash
# Development mode
PORT=8083 pm2 start npm --name whatsapp-otp-service -- run start

# Production mode (with build)
PORT=8083 pm2 start npm --name whatsapp-otp-service -- run start
```

## 10. PM2 Setup

```bash
# Save current processes
pm2 save

# Setup startup script
pm2 startup

# Enable on boot (if using systemd)
systemctl enable pm2-root
```

## 11. Useful PM2 Commands

```bash
# View logs
pm2 logs whatsapp-otp-service

# Restart service
pm2 restart whatsapp-otp-service

# Stop service
pm2 stop whatsapp-otp-service

# Delete service
pm2 delete whatsapp-otp-service

# View status
pm2 status
```

## Troubleshooting

### Puppeteer Chrome missing libraries

If you see errors about missing Chrome libraries, install them:

```bash
apt-get install -y \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2t64 \
  libxshmfence1
```

### Database issues

```bash
# Reset database
npm run db:reset
```

### Port already in use

Find and kill the process using the port:

```bash
lsof -i :8083
kill <PID>
```
