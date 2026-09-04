import type {
  ClientProject,
  ProjectDeliverable,
  ProjectFeedback,
} from "@/lib/client-projects";

export type ClientNextAction = {
  title: string;
  description: string;
  href?: string;
  cta?: string;
  required: boolean;
};

export function deriveClientNextAction({
  project,
  deliverables,
  feedback,
}: {
  project: ClientProject;
  deliverables: ProjectDeliverable[];
  feedback: ProjectFeedback[];
}): ClientNextAction {
  const reviewedDeliverables = new Set(
    feedback
      .filter(
        (item) =>
          item.target_type === "deliverable" &&
          (item.intent === "looks_good" || item.intent === "changes_requested"),
      )
      .map((item) => item.target_id),
  );
  const awaitingReview = deliverables.find(
    (item) =>
      item.status === "ready_for_review" && !reviewedDeliverables.has(item.id),
  );

  if (awaitingReview) {
    return {
      title: `Review ${awaitingReview.title}`,
      description:
        "Review the deliverable and share your approval or requested changes.",
      href: "#deliverables",
      cta: "Review deliverable",
      required: true,
    };
  }

  const explicit = project.next_action.trim();
  if (explicit) {
    return {
      title: "Your next project step",
      description: explicit,
      href: "#project-navigation",
      cta: "Open project details",
      required: true,
    };
  }

  return {
    title: "Nothing needed from you right now.",
    description:
      "The Studio will surface the next step here when your input is needed.",
    required: false,
  };
}
