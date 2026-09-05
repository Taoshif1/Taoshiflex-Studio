import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getClientAuthorization } from "@/lib/client-auth";
import { getStudioPresence } from "@/lib/studio-data";
import { ClientLogout } from "../client-auth-form";
import { ClientMaintenanceBanner } from "../client-maintenance-banner";
import { getClientWorkspaceMaintenance } from "@/lib/client-workspace-maintenance";
import "./workspace-help.css";

export const metadata: Metadata = {
  title: "Workspace Guide / Client Workspace",
  robots: { index: false, follow: false },
};

const contents = [
  ["overview", "Workspace overview"],
  ["project-status", "Project status"],
  ["next-action", "Your Next Action"],
  ["timeline", "Activity Timeline"],
  ["milestones", "Milestones"],
  ["updates", "Updates"],
  ["deliverables", "Deliverables"],
  ["feedback", "Feedback"],
  ["billing-payments", "Billing & payments"],
  ["notifications", "Notifications"],
  ["policies", "Policies"],
  ["account-security", "Account & security"],
  ["getting-help", "Getting help"],
] as const;

export default async function ClientHelpPage() {
  const authorization = await getClientAuthorization();
  if (!authorization) redirect("/client");
  const [presence, maintenance] = await Promise.all([
    getStudioPresence(),
    getClientWorkspaceMaintenance(),
  ]);

  return (
    <main className="client-shell client-help">
      <header id="top" className="client-head">
        <div>
          <p className="eyebrow">Private / Client workspace</p>
          <h1>Workspace Guide</h1>
          <p>A practical guide to following progress, reviewing work and keeping your project moving.</p>
        </div>
        <div className="client-head-actions">
          <Link className="action" href="/client">Back to workspace</Link>
          <ClientLogout />
        </div>
      </header>
      <ClientMaintenanceBanner maintenance={maintenance}/>

      <div className="client-help-layout">
        <nav className="client-help-contents" aria-label="Workspace Guide contents">
          <p className="eyebrow">On this page</p>
          <ol>
            {contents.map(([id, label], index) => (
              <li key={id}>
                <Link href={`#${id}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{label}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="client-help-sections">
          <GuideSection id="overview" number="01" title="Client Workspace overview">
            <p>Your Workspace is the private home for projects accepted by Taoshiflex Studio. It brings the current plan, decisions, files, conversation and commercial position into one place.</p>
            <p>You see only projects assigned to your signed-in account. A project reference or copied page address does not grant access to anyone else.</p>
            <Tip>Start on the Workspace home, open an active project, then look for Your Next Action before reading the detailed sections.</Tip>
          </GuideSection>

          <GuideSection id="project-status" number="02" title="Project status">
            <p>The overview explains where the project stands now:</p>
            <ul>
              <li><strong>Status</strong> shows the overall working state, such as Planning, In Progress, Awaiting Your Review or Completed.</li>
              <li><strong>Current phase</strong> names the part of the work currently receiving attention.</li>
              <li><strong>Progress</strong> is the Studio&apos;s deliberate overall estimate, not an automatic timer.</li>
              <li><strong>Target date</strong> is the current planned completion date when one has been agreed.</li>
              <li><strong>Next Action</strong> identifies the next useful step for you when input is required.</li>
            </ul>
          </GuideSection>

          <GuideSection id="next-action" number="03" title="Your Next Action">
            <p>This card is the quickest answer to “What should I do now?” When action is required, use its main button to move to the relevant project area.</p>
            <p>A deliverable waiting for review may appear here automatically. Otherwise, the Studio&apos;s written next step is shown. A neutral card means there is nothing you need to do right now.</p>
          </GuideSection>

          <GuideSection id="timeline" number="04" title="Project Activity Timeline">
            <p>The timeline is a concise, chronological history assembled from actual project activity: Updates, Milestones, Feedback, Payments and Deliverables.</p>
            <p>On larger screens it moves horizontally from earliest to latest. Scroll with a mouse, trackpad or touch gesture; when the timeline itself is focused, the left and right arrow keys also work. On mobile it becomes a vertical reading flow.</p>
            <p>Use the filters to focus on one kind of activity. “View detail” returns you to the full project section—the timeline never replaces the original record.</p>
          </GuideSection>

          <GuideSection id="milestones" number="05" title="Milestones">
            <p>Milestones divide the project into meaningful stages. Current milestones show work still underway or awaiting review. Completed and previous milestones remain available as project history.</p>
            <p>Pending means the stage has not started; In Progress means work is active; Client Review means your review is expected; Completed means the stage has been finished.</p>
          </GuideSection>

          <GuideSection id="updates" number="06" title="Updates">
            <p>Updates are Studio-published progress notes. They explain what started, changed or completed and may contain context that does not belong in a milestone title.</p>
            <p>Reading an update does not send a reply. Use its Feedback controls when you need to approve, request a change or leave a comment.</p>
          </GuideSection>

          <GuideSection id="deliverables" number="07" title="Deliverables">
            <p>Deliverables are the items prepared for review or handoff. An external deliverable opens an approved outside link. A private file uses the Download control inside your Workspace.</p>
            <p>Private download access is checked each time. If an old download link stops working, return to the project and select Download again.</p>
            <p>When an item is Ready for Review, inspect it and use the attached Feedback controls to approve it or request specific changes.</p>
          </GuideSection>

          <GuideSection id="feedback" number="08" title="Feedback">
            <p>Feedback keeps decisions attached to the correct project item. Choose Looks good for approval, Request changes for a clear revision request, or Comment for a question or note.</p>
            <p>Describe requested changes precisely and keep related points together. The Studio can reply in the same record, and resolved feedback remains visible so the decision history is clear.</p>
            <Tip>Use item-level feedback for a milestone, update or deliverable. Use General feedback only when your message concerns the project as a whole.</Tip>
          </GuideSection>

          <GuideSection id="billing-payments" number="09" title="Billing & payments">
            <p>The Billing summary shows the agreed project value, confirmed amount paid and remaining amount. The payment schedule explains planned installments and due dates where applicable.</p>
            <p>When submitting payment details, choose the relevant installment and enter the amount, method and transaction reference accurately. Submission is evidence for verification—it does not confirm payment automatically.</p>
            <dl className="help-status-list">
              <div><dt>Pending</dt><dd>The Studio has received the submission and still needs to verify it.</dd></div>
              <div><dt>Confirmed</dt><dd>The Studio verified the payment and it now counts toward the paid total.</dd></div>
              <div><dt>Rejected</dt><dd>The submission could not be verified; read the note and contact the Studio or submit corrected details.</dd></div>
              <div><dt>Reversed</dt><dd>A previously confirmed entry was formally corrected. The history remains visible and totals reflect the reversal.</dd></div>
            </dl>
          </GuideSection>

          <GuideSection id="notifications" number="10" title="Notifications">
            <p>The notification control collects recent project events. A NEW count means there are unread items; attention styling highlights something likely to need review.</p>
            <p>Select a notification to go directly to its project section. The project cards on the Workspace home also show unread counts.</p>
          </GuideSection>

          <GuideSection id="policies" number="11" title="Policies">
            <p>Open Policies from the Workspace header to read the currently published terms that apply to Client work. Each policy shows its version and effective date so you can identify the applicable wording.</p>
            <p>New wording is published as a new version instead of silently replacing the historical document.</p>
          </GuideSection>

          <GuideSection id="account-security" number="12" title="Account & security">
            <p>Sign in with the email and password connected to your Client account, and sign out when using a shared device. Keep credentials private; project links and references are not substitutes for signing in.</p>
            <p>If you forget your password, enter your email on Client Access and choose Forgot password. Open the recovery email, confirm the recovery page, then choose a new password. A recovery link is single-use and may expire, so request a new one if it is no longer available.</p>
          </GuideSection>

          <GuideSection id="getting-help" number="13" title="Getting help">
            <p>If a project instruction, payment state or deliverable is unclear, contact Taoshiflex Studio and include your project reference.</p>
            <p>Email <a href={`mailto:${presence.email}`}>{presence.email}</a>{presence.bookingEnabled && presence.bookingUrl ? <> or <a href={presence.bookingUrl} target="_blank" rel="noreferrer">book a call</a></> : null}. The latest contact options are also available in the public site footer.</p>
          </GuideSection>
        </div>
      </div>
    </main>
  );
}

function GuideSection({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="client-help-section" aria-labelledby={`${id}-title`}>
      <header><span>{number}</span><h2 id={`${id}-title`}>{title}</h2></header>
      <div>{children}</div>
      <Link className="help-back-to-top" href="#top">Back to top ↑</Link>
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return <aside className="client-help-tip"><strong>Good to know</strong><p>{children}</p></aside>;
}
