import { authorizeMutation } from "@/lib/admin-security";
import { sendTestInquiryAlert } from "@/lib/inquiry-alerts";

export async function POST(request: Request) {
  const authorization = await authorizeMutation(request);
  if (authorization.error) return authorization.error;
  const body = (await request.json().catch(() => null)) as {
    channel?: unknown;
  } | null;
  if (body?.channel !== "email") {
    return Response.json({ error: "Choose a valid alert channel." }, { status: 400 });
  }
  try {
    await sendTestInquiryAlert("email");
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Test email could not be delivered. Review the saved recipient and server configuration." },
      { status: 503 },
    );
  }
}
