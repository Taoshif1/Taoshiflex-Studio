import type { PolicyAudience } from "./policies";

export type StarterPolicy = {
  slug: string;
  title: string;
  audience: PolicyAudience;
  summary: string;
  content: string;
  sortOrder: number;
};

export const starterPolicies: StarterPolicy[] = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    audience: "both",
    summary: "Terms governing Studio services, Client responsibilities, project agreements, and acceptable use.",
    content: `## Purpose

These terms outline the general working relationship between Taoshiflex Studio and its clients. Project-specific proposals, scopes, and signed agreements remain authoritative for each engagement.

## Working together

Both parties should provide accurate information, communicate material changes promptly, and use Studio services lawfully. Timelines depend on timely access, feedback, approvals, and payments.

## Application

These terms apply to Studio services and use of the Client Workspace. A project-specific proposal, scope, or signed agreement takes priority where its terms differ.`,
    sortOrder: 10,
  },
  {
    slug: "pricing-payment-policy",
    title: "Pricing & Payment Policy",
    audience: "both",
    summary: "How project pricing, payment schedules, and payment verification are managed.",
    content: `## Project pricing

Each project's agreed value, currency, and payment schedule are confirmed in its proposal or Client Workspace. Public package prices are starting references unless explicitly accepted in writing.

## Payments

Clients should follow the current payment schedule and include a valid transaction reference. Submitted payments remain pending until the Studio verifies receipt.

## Changes

Approved scope changes may affect pricing or schedule only after they are documented and accepted.`,
    sortOrder: 20,
  },
  {
    slug: "scope-revision-policy",
    title: "Scope & Revision Policy",
    audience: "client",
    summary: "How agreed scope, feedback rounds, revisions, and change requests are handled.",
    content: `## Agreed scope

The approved proposal and project record define the deliverables, milestones, and included work.

## Revisions

Included revision rounds should be used for feedback within the agreed direction. New requirements, major direction changes, or requests outside scope may require a revised estimate and timeline.

## Approval

The Studio will document material scope changes for Client approval before starting additional work.`,
    sortOrder: 30,
  },
  {
    slug: "cancellation-refund-policy",
    title: "Cancellation & Refund Policy",
    audience: "both",
    summary: "The process for pausing or cancelling work and reviewing refund requests.",
    content: `## Cancellation requests

Requests to pause or cancel a project should be made in writing. The Studio will confirm the effective date and current project status.

## Completed and committed work

Amounts already earned for completed work, approved milestones, or committed third-party costs are normally accounted for before any refund is considered.

## Project-specific terms

Any signed proposal or agreement may set different cancellation terms and should be reviewed first.`,
    sortOrder: 40,
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    audience: "public",
    summary: "How the Studio collects, uses, shares, retains, and protects personal information.",
    content: `## Information collected

The Studio may collect contact details, project requirements, communications, account records, and service activity needed to respond to enquiries and deliver work.

## How information is used

Information is used to communicate, manage projects, provide requested services, maintain security, and meet applicable operational obligations.

## Questions and requests

Clients may contact the Studio with reasonable questions or requests about their personal information. Requests are handled in line with applicable obligations and legitimate record-keeping needs.`,
    sortOrder: 50,
  },
  {
    slug: "project-delivery-policy",
    title: "Project Delivery Policy",
    audience: "client",
    summary: "How reviews, approvals, acceptance, and final deliverable handoff are managed.",
    content: `## Delivery process

Deliverables are shared through the agreed channel or Client Workspace. Clients should review each delivery within the response period stated for the project.

## Acceptance

Approval should be recorded clearly. Unresolved issues that fall within scope will be handled through the agreed revision process.

## Final handoff

Final files, access, and documentation are provided according to the project agreement and any outstanding payment conditions.`,
    sortOrder: 60,
  },
  {
    slug: "support-maintenance-policy",
    title: "Support & Maintenance Policy",
    audience: "both",
    summary: "The distinction between included delivery support and ongoing maintenance services.",
    content: `## Included support

Any post-delivery support included with a project is limited to the period and scope stated in the proposal or Client Workspace.

## Ongoing maintenance

Hosting, monitoring, content updates, dependency upgrades, and new feature work require an active maintenance arrangement unless expressly included.

## Requests

Support requests should include the affected service, expected behavior, actual behavior, and relevant screenshots or steps.`,
    sortOrder: 70,
  },
  {
    slug: "intellectual-property-source-code-policy",
    title: "Intellectual Property & Source Code Policy",
    audience: "client",
    summary: "How ownership, licences, source delivery, and third-party materials are handled.",
    content: `## Project ownership

Ownership and licence terms are defined by the applicable proposal or agreement. Any agreed transfer may depend on full payment and completion of stated obligations.

## Studio and third-party materials

Pre-existing Studio methods, reusable components, open-source software, fonts, stock assets, and third-party services retain their respective ownership and licence terms.

## Source delivery

Source files, repositories, credentials, and documentation are provided only when included in the agreed deliverables.`,
    sortOrder: 80,
  },
  {
    slug: "client-workspace-confidentiality",
    title: "Client Workspace & Confidentiality",
    audience: "client",
    summary: "How Client Workspace access and confidential project information must be handled.",
    content: `## Workspace access

Client Workspace access is limited to authorized project members. Users should protect login links and credentials, use individual accounts, and report suspected unauthorized access promptly.

## Project information

The workspace may contain private project updates, feedback, billing records, and deliverables. Members should share that information only with people authorized by their organization.

## Confidential handling

The Studio will use reasonable operational safeguards and limit project information to service delivery, support, security, and agreed collaboration needs.`,
    sortOrder: 90,
  },
];
