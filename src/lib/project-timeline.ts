import {
  feedbackIntentLabel,
  statusLabel,
  type ProjectDeliverable,
  type ProjectFeedback,
  type ProjectMilestone,
  type ProjectUpdate,
} from "@/lib/client-projects";
import {
  formatMoney,
  type ProjectBilling,
  type ProjectPayment,
} from "@/lib/commercial";

export const projectTimelineTypes = [
  "project",
  "update",
  "milestone",
  "feedback",
  "payment",
  "deliverable",
] as const;

export type ProjectTimelineType = (typeof projectTimelineTypes)[number];

export type ProjectTimelineEvent = {
  id: string;
  type: ProjectTimelineType;
  occurredAt: string;
  title: string;
  summary?: string;
  actor?: string;
  status?: string;
  amount?: string;
  href?: string;
  visibility: "client";
};

type TimelineSources = {
  updates: ProjectUpdate[];
  milestones: ProjectMilestone[];
  feedback: ProjectFeedback[];
  payments: ProjectPayment[];
  deliverables: ProjectDeliverable[];
  billing?: ProjectBilling | null;
  feedbackAuthorLabels?: ReadonlyMap<string, string>;
};

function concise(value: string, maximum = 150) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1).trimEnd()}…`
    : normalized;
}

export function buildProjectTimeline({
  updates,
  milestones,
  feedback,
  payments,
  deliverables,
  billing,
  feedbackAuthorLabels,
}: TimelineSources) {
  const events: ProjectTimelineEvent[] = [];

  for (const update of updates) {
    events.push({
      id: `update-${update.id}`,
      type: "update",
      occurredAt: update.published_at,
      title: update.title,
      summary: concise(update.body),
      actor: "Studio",
      href: "#updates",
      visibility: "client",
    });
  }

  for (const milestone of milestones) {
    events.push({
      id: `milestone-created-${milestone.id}`,
      type: "milestone",
      occurredAt: milestone.created_at,
      title: `Milestone added: ${milestone.title}`,
      actor: "Studio",
      href: "#milestones",
      visibility: "client",
    });
    if (milestone.completed_at) {
      events.push({
        id: `milestone-completed-${milestone.id}`,
        type: "milestone",
        occurredAt: milestone.completed_at,
        title: milestone.title,
        actor: "Studio",
        status: "Completed",
        href: "#milestones",
        visibility: "client",
      });
    }
  }

  for (const item of feedback) {
    const author =
      feedbackAuthorLabels?.get(item.author_user_id) ?? "Client";
    events.push({
      id: `feedback-submitted-${item.id}`,
      type: "feedback",
      occurredAt: item.created_at,
      title:
        item.intent === "changes_requested"
          ? "Revision requested"
          : item.intent === "looks_good"
            ? "Approval shared"
            : `Feedback on ${item.target_label}`,
      summary: item.message ? concise(item.message) : undefined,
      actor: author,
      status: feedbackIntentLabel(item.intent),
      href: item.target_type === "project" ? "#feedback" : `#${item.target_type}s`,
      visibility: "client",
    });
    if (item.responded_at && item.studio_response) {
      events.push({
        id: `feedback-response-${item.id}`,
        type: "feedback",
        occurredAt: item.responded_at,
        title: `Studio responded to ${item.target_label}`,
        summary: concise(item.studio_response),
        actor: "Studio",
        status: "Response sent",
        href: item.target_type === "project" ? "#feedback" : `#${item.target_type}s`,
        visibility: "client",
      });
    }
    if (item.resolved_at) {
      events.push({
        id: `feedback-resolved-${item.id}`,
        type: "feedback",
        occurredAt: item.resolved_at,
        title: `Feedback resolved: ${item.target_label}`,
        actor: "Studio",
        status: "Resolved",
        href: item.target_type === "project" ? "#feedback" : `#${item.target_type}s`,
        visibility: "client",
      });
    }
  }

  const decimals = billing?.currency_decimals ?? 2;
  for (const payment of payments) {
    const amount = formatMoney(payment.amount_minor, payment.currency, decimals);
    if (payment.entry_type === "payment" && payment.origin === "client_submission") {
      events.push({
        id: `payment-submitted-${payment.id}`,
        type: "payment",
        occurredAt: payment.submitted_at,
        title: "Payment submitted",
        actor: "Client",
        status: "Submitted",
        amount,
        href: "#billing",
        visibility: "client",
      });
    }
    if (payment.confirmed_at) {
      events.push({
        id: `payment-confirmed-${payment.id}`,
        type: "payment",
        occurredAt: payment.confirmed_at,
        title:
          payment.entry_type === "reversal"
            ? "Payment reversed"
            : "Payment confirmed",
        actor: "Studio",
        status: payment.entry_type === "reversal" ? "Reversed" : "Confirmed",
        amount,
        href: "#billing",
        visibility: "client",
      });
    } else if (payment.rejected_at) {
      events.push({
        id: `payment-rejected-${payment.id}`,
        type: "payment",
        occurredAt: payment.rejected_at,
        title: "Payment not confirmed",
        actor: "Studio",
        status: "Rejected",
        amount,
        href: "#billing",
        visibility: "client",
      });
    }
  }

  for (const deliverable of deliverables) {
    events.push({
      id: `deliverable-created-${deliverable.id}`,
      type: "deliverable",
      occurredAt: deliverable.created_at,
      title: `Deliverable added: ${deliverable.title}`,
      summary: deliverable.description
        ? concise(deliverable.description)
        : undefined,
      actor: "Studio",
      status: statusLabel(deliverable.status),
      href: "#deliverables",
      visibility: "client",
    });
  }

  return events.sort(
    (left, right) =>
      Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
      left.id.localeCompare(right.id),
  );
}
