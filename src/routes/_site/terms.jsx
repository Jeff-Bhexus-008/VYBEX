import { createFileRoute, Link } from "@tanstack/react-router";
import StaticPage from "@/components/StaticPage";

export const Route = createFileRoute("/_site/terms")({
  head: () => ({ meta: [{ title: "Terms of Use — VYBEX" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <StaticPage
      title="Terms of Use"
      lead="The basics of using VYBEX. This demo build does not publish legal registration details; treat this as a plain-language summary, not legal advice."
    >
      <h2>Using the service</h2>
      <p>
        VYBEX lets you discover and watch videos, save titles to a personal library, and — with an account — upload
        content for review. Keep your credentials to yourself and use the service lawfully.
      </p>
      <h2>Content rules</h2>
      <ul>
        <li>Only upload content you own or are authorised to share.</li>
        <li>Uploads are private until a moderator approves them.</li>
        <li>We may remove content that infringes rights, breaks the law, or violates these terms.</li>
        <li>Copyright owners and users can request removal via the <Link to="/report">report form</Link>.</li>
      </ul>
      <h2>Content sources</h2>
      <p>
        Demo titles are streamed from public sample media and labeled as such. The platform is intended for authorised
        content only — public-domain, Creative Commons, licensed, or original works. Circumventing DRM or paywalls is
        strictly off-limits.
      </p>
      <h2>Accounts</h2>
      <p>
        We may suspend accounts that abuse the upload pipeline, spam reports, or attempt to gain unauthorised access to
        administrative features. You can sign out and your personal data stays scoped to your account (see{" "}
        <Link to="/privacy">Privacy</Link>).
      </p>
      <h2>As-is service</h2>
      <p>
        This build is provided as-is for demonstration. Features may change, and media availability depends on its
        sources.
      </p>
    </StaticPage>
  );
}