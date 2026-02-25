import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "whatsapp_bridge_secret_key_2024";
const JWT_EXPIRY = "24h";

export interface TokenPayload {
  id: number;
  email: string;
  type: "admin" | "client";
  clientId?: number;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateClientToken(apiKey: string, clientId: number, clientName: string): string {
  return jwt.sign(
    { id: clientId, apiKey, type: "client", name: clientName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}
