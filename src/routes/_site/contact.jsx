import { createFileRoute, Link } from "@tanstack/react-router";
import StaticPage from "@/components/StaticPage";

export const Route = createFileRoute("/_site/contact")({
  head: () => ({ meta: [{ title: "Contact — VYBEX" }] }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <StaticPage title="Contact" lead="How to reach the right place, fast.">
      <h2>Report a title or request a takedown</h2>
      <p>
        The fastest route for content issues — copyright, inappropriate material, broken playback — is the{" "}
        <Link to="/report">Report Content</Link> form. Reports go straight to the moderation queue and are handled in the
        admin review area.
      </p>
      <h2>Account & playback issues</h2>
      <p>
        Check the <Link to="/help">Help page</Link> first — most playback and account questions are answered there. Your
        profile page lets you manage your avatar, preferences and watch history.
      </p>
      <h2>A note on contact details</h2>
      <p>
        VYBEX is a demonstration build, so this page deliberately does not publish a company address, phone number or
        legal registration details. When the platform owner customises this deployment, real contact channels can be
        added here.
      </p>
    </StaticPage>
  );
}