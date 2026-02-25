import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../services/admin.service";

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
    const stats = await AdminService.getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
