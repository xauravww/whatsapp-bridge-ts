import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../services/admin.service";
import ClientService from "../../../../services/client.service";

async function adminAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: NextResponse.json({ success: false, message: "No token" }, { status: 401 }) };
  const validation = await AdminService.validateToken(token);
  if (!validation.valid) return { error: NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }) };
  return { admin: validation.admin };
}

export async function GET(request: NextRequest) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const clients = await ClientService.getAllClients();
    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const { name, rateLimit, rateLimitEnabled } = await request.json();
    const client = await ClientService.createClient(name, rateLimit, rateLimitEnabled);
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
