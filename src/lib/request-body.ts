import { validDate } from "./security-contract.ts";
// Bound the stream itself, including chunked requests without Content-Length.
export async function readBody(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length")) > maximum) throw new Error("body_too_large");
  if (!request.body) throw new Error("body_missing");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut=true; void reader.cancel().catch(() => undefined); }, 10_000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) { void reader.cancel().catch(() => undefined); throw new Error("body_too_large"); }
      chunks.push(value);
    }
    if(timedOut) throw new Error("body_timeout");
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally { clearTimeout(deadline); reader.releaseLock(); }
}

const fields: Record<string, string> = {
  "/api/studio/auth": "email password",
  "/api/studio/billing": "kind projectId currency decimals projectValue depositPercentage label amount percentage dueDate method scheduleItemId referenceId note instructions methods id orderedIds paymentId decision reason archive",
  "/api/studio/client-feedback": "action id projectId response",
  "/api/studio/client-projects": "kind projectId id email role temporaryPassword title description status sortOrder dueDate body externalUrl password confirmed name clientName summary progress currentPhase nextAction startDate targetDate orderedIds archive",
  "/api/studio/deliverable-files": "projectId deliverableId fileName fileType fileSize finalizeToken",
  "/api/studio/github": "id",
  "/api/studio/inquiry-alerts": "channel",
  "/api/studio/inquiries": "id status",
  "/api/studio/inquiries/convert": "id name clientName summary status currentPhase nextAction startDate targetDate",
  "/api/studio/packages": "id slug name description deliveryEstimate revisions support category features customQuote priceFrom enabled featured sortOrder",
  "/api/studio/policies": "kind id policyId slug title audience summary content sortOrder effectiveDate publish archived",
  "/api/studio/product-media": "id alt sort_order",
  "/api/studio/products": "id confirmName slug name tagline summary story problem solution roadmap category accent pricing_model status features technologies product_url repository_url show_repository source_repository_private published featured sort_order launch_date",
  "/api/studio/project-media": "id projectId orderedIds setCoverId",
  "/api/studio/projects": "id confirmName slug name client category status summary context challenge approach solution result repositoryUrl liveUrl behanceUrl facebookUrl accent capabilities features technicalNotes visibility showRepository sortOrder",
  "/api/studio/reviews": "id published featured sort_order public_project_id moderation_note",
  "/api/studio/settings": "key value",
  "/api/client/feedback": "projectId targetType targetId intent message",
  "/api/client/payments": "projectId method referenceId note scheduleItemId amount",
  "/api/client/reviews": "projectId reviewer_name reviewer_role reviewer_company rating review_text",
  "/api/notifications": "action id",
  "/api/inquiries": "projectType stage goals budget timeline details name business email phone",
  "/api/assistant": "question history",
  "/client/auth/recovery": "password",
};

// Method-specific fields prevent one operation from accepting another's payload.
const methodFields: Record<string, Record<string, string>> = {
  "/api/studio/auth": { POST: fields["/api/studio/auth"] },
  "/api/studio/billing": {
    POST: "kind projectId currency decimals projectValue depositPercentage label amount percentage dueDate method scheduleItemId referenceId note",
    PATCH: "kind projectId projectValue instructions methods id label amount percentage dueDate orderedIds paymentId decision reason archive",
  },
  "/api/studio/client-projects": {
    POST: "kind projectId email role temporaryPassword title description status sortOrder dueDate body externalUrl",
    PATCH: "kind projectId id password confirmed name clientName summary status progress currentPhase nextAction startDate targetDate orderedIds archive title description dueDate externalUrl",
    DELETE: "kind projectId id",
  },
  "/api/studio/deliverable-files": { POST: "projectId deliverableId fileName fileType fileSize", PATCH: "finalizeToken", DELETE: "projectId deliverableId" },
  "/api/studio/packages": { POST: fields["/api/studio/packages"].replace("id ", ""), PATCH: fields["/api/studio/packages"], DELETE: "id" },
  "/api/studio/policies": { POST: "kind slug title audience summary content sortOrder effectiveDate", PATCH: "kind id policyId slug title audience summary content sortOrder effectiveDate publish archived", DELETE: "id" },
  "/api/studio/products": { POST: fields["/api/studio/products"].replace("id confirmName ", ""), PATCH: fields["/api/studio/products"].replace("confirmName ", ""), DELETE: "id confirmName" },
  "/api/studio/projects": { PATCH: fields["/api/studio/projects"].replace("confirmName ", ""), DELETE: "id confirmName" },
  "/api/studio/product-media": { PATCH: "id alt sort_order", DELETE: "id" },
  "/api/studio/project-media": { PATCH: "projectId orderedIds setCoverId", DELETE: "id" },
};
const singleMethods: Record<string, string> = {
  "/api/studio/client-feedback": "PATCH", "/api/studio/github": "POST",
  "/api/studio/inquiry-alerts": "POST", "/api/studio/inquiries": "PATCH",
  "/api/studio/inquiries/convert": "POST", "/api/studio/reviews": "PATCH",
  "/api/studio/settings": "PATCH", "/api/client/feedback": "POST",
  "/api/client/payments": "POST", "/api/client/reviews": "POST",
  "/api/notifications": "PATCH", "/api/inquiries": "POST", "/api/assistant": "POST",
  "/client/auth/recovery": "PATCH",
};

function boundedObject(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof value === "string") return value.length <= 100_000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 100 && value.every(item => boundedObject(item, depth + 1));
  if (value && typeof value === "object") return Object.entries(value).length <= 60 && Object.entries(value).every(([key, item]) => !["__proto__", "constructor", "prototype"].includes(key) && boundedObject(item, depth + 1));
  return value === null || typeof value === "boolean";
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const path = new URL(request.url).pathname;
    const allowed = (methodFields[path]
      ? methodFields[path][request.method]
      : singleMethods[path] === request.method ? fields[path] : undefined)?.split(" ");
    if (!allowed) return null;
    const maximum = path === "/api/studio/policies" ? 450_000 : path === "/api/assistant" ? 12_000 : 64_000;
    const bytes = await readBody(request, maximum);
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value) || !boundedObject(value) || Object.keys(value).some(key => !allowed.includes(key))) return null;
    const row=value as Record<string,unknown>;
    for(const key of ["dueDate","startDate","targetDate","effectiveDate","launch_date"])if(row[key]!==undefined&&row[key]!==null&&row[key]!==""&&!validDate(row[key]))return null;
    for(const key of ["sortOrder","sort_order"])if(row[key]!==undefined&&(typeof row[key]!=="number"||!Number.isInteger(row[key])||Math.abs(row[key])>100000))return null;
    return row;
  } catch { return null; }
}

export async function readForm(request: Request, maximum = 6 * 1024 * 1024 + 16_384) {
  try {
    const bytes = await readBody(request, maximum);
    return await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch { return null; }
}
