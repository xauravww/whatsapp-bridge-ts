import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../../services/admin.service";
import WhatsappService from "../../../../../services/whatsapp.service";

async function adminAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { error: NextResponse.json({ success: false, message: "No token" }, { status: 401 }) };
  const validation = await AdminService.validateToken(token);
  if (!validation.valid) return { error: NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }) };
  return { admin: validation.admin };
}

export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const result = await WhatsappService.deleteSession(params.sessionId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const action = request.nextUrl.searchParams.get("action");
    if (action === "connect") {
      const result = await WhatsappService.connect(params.sessionId);
      return NextResponse.json(result);
    } else if (action === "disconnect") {
      const result = await WhatsappService.disconnect(params.sessionId);
      return NextResponse.json(result);
    }
    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = await adminAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const status = await WhatsappService.getStatus(params.sessionId);
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
