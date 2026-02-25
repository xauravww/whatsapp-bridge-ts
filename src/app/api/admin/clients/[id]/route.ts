import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../../services/admin.service";
import ClientService from "../../../../../services/client.service";

async function adminAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: NextResponse.json({ success: false, message: "No token" }, { status: 401 }) };
  const validation = await AdminService.validateToken(token);
  if (!validation.valid) return { error: NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }) };
  return { admin: validation.admin };
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const client = await ClientService.getClient(parseInt(params.id));
    if (!client) return NextResponse.json({ success: false, message: "Client not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const { name, rateLimit, rateLimitEnabled, isActive, whitelistedIps } = await request.json();
    const client = await ClientService.updateClient(parseInt(params.id), { name, rateLimit, rateLimitEnabled, isActive, whitelistedIps });
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    await ClientService.deleteClient(parseInt(params.id));
    return NextResponse.json({ success: true, message: "Client deleted" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
