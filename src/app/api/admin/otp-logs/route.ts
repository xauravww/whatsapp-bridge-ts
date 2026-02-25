import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../services/admin.service";
import OtpService from "../../../../services/otp.service";

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
    const clientId = request.nextUrl.searchParams.get("clientId");
    const logs = await OtpService.getOtpLogs(clientId ? parseInt(clientId) : undefined);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
