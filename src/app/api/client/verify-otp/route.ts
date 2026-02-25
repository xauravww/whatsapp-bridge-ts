import { NextRequest, NextResponse } from "next/server";
import ClientService from "../../../../services/client.service";
import OtpService from "../../../../services/otp.service";

async function clientAuth(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return { error: NextResponse.json({ success: false, message: "No API key" }, { status: 401 }) };
  const validation = await ClientService.validateApiKey(apiKey);
  if (!validation.valid) return { error: NextResponse.json({ success: false, message: "Invalid API key" }, { status: 401 }) };
  return { client: validation.client };
}

export async function POST(request: NextRequest) {
  const auth = await clientAuth(request);
  if ("error" in auth) return auth.error;
  try {
    const { phone, otp } = await request.json();
    const result = await OtpService.verifyOtp(auth.client!.id, phone, otp);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
