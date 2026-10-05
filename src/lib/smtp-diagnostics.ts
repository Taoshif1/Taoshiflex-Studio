const messages = {
  smtp_auth: "SMTP authentication failed. Verify the provider credential/App Password.",
  smtp_dns: "SMTP host could not be resolved. Verify the configured hostname and DNS.",
  smtp_refused: "SMTP connection was refused. Verify the host, port and provider availability.",
  smtp_timeout: "SMTP connection timed out. Check provider availability and network access.",
  smtp_tls: "SMTP TLS negotiation failed. Verify the TLS mode, port and certificate configuration.",
  smtp_recipient: "SMTP recipient was rejected. Verify the saved recipient address.",
  smtp_unavailable: "SMTP configuration is incomplete or invalid.",
  site_url_unavailable: "The Studio site URL is missing or invalid.",
  smtp_delivery_failed: "SMTP provider could not accept the test email. Check provider availability and sender permissions.",
} as const;
export type SmtpDiagnosticCode = keyof typeof messages;

// Never copy provider message, response, credentials, addresses or stack to logs/API.
export function smtpDiagnostic(error: unknown): { code: SmtpDiagnosticCode; message: string } {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof value.code === "string" ? value.code.toUpperCase() : "";
  const cause = value.cause && typeof value.cause === "object" ? value.cause as Record<string, unknown> : {};
  const causeCode = typeof cause.code === "string" ? cause.code.toUpperCase() : "";
  const codes = [code, causeCode];
  // Nodemailer overwrites native socket codes with ESOCKET. Inspect bounded text
  // only to classify it; never include that text in the returned diagnostic.
  const socketText = ["ESOCKET", "ECONNECTION"].includes(code) && typeof value.message === "string" ? value.message.slice(0, 512) : "";
  let safe: SmtpDiagnosticCode = "smtp_delivery_failed";
  const known = typeof value.code === "string" ? value.code : "";
  if (Object.prototype.hasOwnProperty.call(messages, known)) safe = known as SmtpDiagnosticCode;
  else if (code === "EAUTH") safe = "smtp_auth";
  else if (codes.some(c => ["EDNS", "ENOTFOUND", "EAI_AGAIN"].includes(c))) safe = "smtp_dns";
  else if (codes.includes("ECONNREFUSED") || /\bECONNREFUSED\b/i.test(socketText)) safe = "smtp_refused";
  else if (codes.some(c => ["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(c)) || /\bETIMEDOUT\b|timed out/i.test(socketText)) safe = "smtp_timeout";
  else if (codes.some(c => /^(?:ETLS|EREQUIRETLS|ERR_TLS_|ERR_SSL_|CERT_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(c)) || /certificate|\bTLS\b|\bSSL\b|wrong version number/i.test(socketText)) safe = "smtp_tls";
  else if (code === "EENVELOPE" && value.command === "RCPT TO") safe = "smtp_recipient";
  return { code: safe, message: messages[safe] };
}
