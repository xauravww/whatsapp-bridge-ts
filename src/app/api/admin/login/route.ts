import { NextRequest, NextResponse } from "next/server";
import AdminService from "../../../../services/admin.service";
import WhatsappService from "../../../../services/whatsapp.service";

export async function POST(request: NextRequest) {
  try {
    await AdminService.initialize();
    await WhatsappService.initialize();
    const { email, password } = await request.json();
    const result = await AdminService.login(email, password);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
