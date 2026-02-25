import { NextRequest, NextResponse } from "next/server";
import ClientService from "../../../../services/client.service";
import WhatsappService from "../../../../services/whatsapp.service";

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "API key required" }, { status: 401 });
    }

    const client = await ClientService.validateApiKey(apiKey);
    if (!client) {
      return NextResponse.json({ success: false, message: "Invalid API key" }, { status: 401 });
    }

    const { phone, message, sessionId } = await request.json();
    if (!phone || !message) {
      return NextResponse.json({ success: false, message: "phone and message required" }, { status: 400 });
    }

    const result = await WhatsappService.sendMessage(phone, message, sessionId || "default");
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
