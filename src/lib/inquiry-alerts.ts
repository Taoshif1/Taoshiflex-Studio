import "server-only";

import nodemailer from "nodemailer";

import type { InquiryRecord } from "@/lib/inquiries";
import {
  normalizeStudioAlertSettings,
  type StudioAlertSettings,
} from "@/lib/studio-alert-settings";
import { supabaseRest } from "@/lib/supabase-rest";

const smtpTimeoutMs = 8_000;

type AlertInquiry = Pick<
  InquiryRecord,
  "id" | "reference" | "created_at" | "payload"
>;

class AlertDeliveryError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(code);
    this.name = "AlertDeliveryError";
  }
}

function envText(name: string) {
  return process.env[name]?.trim() ?? "";
}

function smtpConfiguration() {
  const host = envText("STUDIO_ALERT_SMTP_HOST");
  const port = Number(envText("STUDIO_ALERT_SMTP_PORT"));
  const secureValue = envText("STUDIO_ALERT_SMTP_SECURE").toLowerCase();
  const user = envText("STUDIO_ALERT_SMTP_USER");
  const password = envText("STUDIO_ALERT_SMTP_PASSWORD");
  const from = envText("STUDIO_ALERT_SMTP_FROM");
  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535 ||
    !["true", "false"].includes(secureValue) ||
    !user ||
    !password ||
    !from ||
    /[\r\n]/.test(from)
  ) {
    return null;
  }
  return { host, port, secure: secureValue === "true", user, password, from };
}

export function getStudioAlertReadiness() {
  return { email: Boolean(smtpConfiguration()) };
}

export async function loadStudioAlertSettings() {
  const rows = await supabaseRest<Array<{ value?: unknown }>>(
    "site_settings?key=eq.studio_alerts&public=eq.false&select=value&limit=1",
    {},
    "privileged",
  );
  return normalizeStudioAlertSettings(rows[0]?.value);
}

function siteOrigin() {
  const configured = envText("NEXT_PUBLIC_SITE_URL");
  try {
    const url = new URL(configured);
    if (
      (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
      (url.protocol !== "https:" && url.protocol !== "http:")
    ) {
      throw new Error("invalid protocol");
    }
    return url.origin;
  } catch {
    throw new AlertDeliveryError("site_url_unavailable");
  }
}

function html(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function submittedAt(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function inquiryRows(inquiry: AlertInquiry) {
  const item = inquiry.payload;
  return [
    ["Reference", inquiry.reference ?? "Reference pending"],
    ["Submitted", submittedAt(inquiry.created_at)],
    ["Client name", item.name],
    ["Business / company", item.business || "Not provided"],
    ["Email", item.email],
    ["Phone", item.phone || "Not provided"],
    ["Project type", item.projectType],
    ["Current stage", item.stage],
    ["Budget", item.budget],
    ["Timeline", item.timeline],
    ["Goals", item.goals.join(", ")],
    ["Project details", item.details],
  ] as const;
}

export function buildInquiryEmail(inquiry: AlertInquiry) {
  const reference = oneLine(inquiry.reference ?? "Reference pending");
  const clientName = oneLine(inquiry.payload.name);
  const adminUrl = `${siteOrigin()}/studio-admin/inquiries/${encodeURIComponent(inquiry.id)}`;
  const rows = inquiryRows(inquiry);
  const text = [
    "NEW PROJECT INQUIRY",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open in Studio Admin: ${adminUrl}`,
  ].join("\n");
  const table = rows
    .map(
      ([label, value]) =>
        `<tr><th style="padding:8px 16px 8px 0;text-align:left;vertical-align:top;color:#8b8274;font-weight:600">${html(label)}</th><td style="padding:8px 0;white-space:pre-wrap;color:#201e1a">${html(value)}</td></tr>`,
    )
    .join("");
  return {
    subject: `New Studio Inquiry — ${reference} — ${clientName}`,
    text,
    html: `<div style="margin:0;padding:32px;background:#f2eee5;color:#201e1a;font-family:Arial,sans-serif"><div style="max-width:680px;margin:0 auto;padding:32px;background:#fff;border:1px solid #d8c9b2"><p style="margin:0 0 10px;color:#92703f;font-size:12px;font-weight:700;letter-spacing:.14em">NEW PROJECT INQUIRY</p><h1 style="margin:0 0 24px;font-size:28px">${html(reference)}</h1><table style="width:100%;border-collapse:collapse">${table}</table><p style="margin:28px 0 0"><a href="${html(adminUrl)}" style="display:inline-block;padding:12px 18px;background:#201e1a;color:#f2eee5;text-decoration:none">Open in Studio Admin</a></p></div></div>`,
  };
}

function testEmail() {
  const adminUrl = `${siteOrigin()}/studio-admin/inquiries`;
  return {
    subject: "Taoshiflex Studio test notification",
    text: `Taoshiflex Studio test notification\n\nEmail inquiry alerts are configured.\n\nOpen Studio Admin: ${adminUrl}`,
    html: `<div style="padding:32px;background:#f2eee5;color:#201e1a;font-family:Arial,sans-serif"><h1>Taoshiflex Studio test notification</h1><p>Email inquiry alerts are configured.</p><p><a href="${html(adminUrl)}">Open Studio Admin</a></p></div>`,
  };
}

async function sendEmail(
  settings: StudioAlertSettings,
  content: { subject: string; text: string; html: string },
) {
  const configuration = smtpConfiguration();
  if (!configuration) throw new AlertDeliveryError("smtp_unavailable");
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    auth: { user: configuration.user, pass: configuration.password },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: smtpTimeoutMs,
  });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transporter.sendMail({
        from: configuration.from,
        to: settings.emailTo,
        subject: content.subject,
        text: content.text,
        html: content.html,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new AlertDeliveryError("smtp_timeout")),
          smtpTimeoutMs,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof AlertDeliveryError) throw error;
    throw new AlertDeliveryError("smtp_delivery_failed");
  } finally {
    if (timeout) clearTimeout(timeout);
    transporter.close();
  }
}

function logAlertFailure(channel: string, error: unknown) {
  const diagnostic =
    error instanceof AlertDeliveryError
      ? { code: error.code, status: error.status }
      : { code: "unexpected_failure" };
  console.error(`[studio-alerts] ${channel} delivery failed`, diagnostic);
}

export async function dispatchNewInquiryAlerts(inquiry: AlertInquiry) {
  let settings: StudioAlertSettings;
  try {
    settings = await loadStudioAlertSettings();
  } catch (error) {
    logAlertFailure("settings", error);
    return;
  }

  const attempts: Array<{ channel: string; promise: Promise<void> }> = [];
  if (settings.emailEnabled) {
    attempts.push({
      channel: "email",
      promise: Promise.resolve().then(() =>
        sendEmail(settings, buildInquiryEmail(inquiry)),
      ),
    });
  }
  const outcomes = await Promise.allSettled(attempts.map((item) => item.promise));
  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      logAlertFailure(attempts[index].channel, outcome.reason);
    }
  });
}

export async function sendTestInquiryAlert(channel: "email") {
  const settings = await loadStudioAlertSettings();
  if (channel === "email") await sendEmail(settings, testEmail());
}
