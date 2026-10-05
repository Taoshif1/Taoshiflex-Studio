import { smtpDiagnostic } from "@/lib/smtp-diagnostics";
import { readJson } from "@/lib/request-body";
import { authorizeMutation } from "@/lib/admin-security";
import { sendTestInquiryAlert } from "@/lib/inquiry-alerts";

export async function POST(request: Request) {
  const authorization = await authorizeMutation(request);
  if (authorization.error) return authorization.error;
  const body = (await readJson(request).catch(() => null)) as {
    channel?: unknown;
  } | null;
  if (body?.channel !== "email") {
    return Response.json({ error: "Choose a valid alert channel." }, { status: 400 });
  }
  try {
    await sendTestInquiryAlert("email");
    return Response.json({ ok: true });
  } catch (error) {
    const diagnostic = smtpDiagnostic(error);
    return Response.json(
      { error: diagnostic.message, code: diagnostic.code },
      { status: 503 },
    );
  }
}
