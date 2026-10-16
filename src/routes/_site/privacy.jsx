import { createFileRoute, Link } from "@tanstack/react-router";
import StaticPage from "@/components/StaticPage";

export const Route = createFileRoute("/_site/privacy")({
  head: () => ({ meta: [{ title: "Privacy — VYBEX" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <StaticPage
      title="Privacy"
      lead="What VYBEX stores about you and the controls you have. A plain-language summary for this demo build — not legal advice."
    >
      <h2>What we store</h2>
      <ul>
        <li><strong>Account basics</strong> — your name, email and role, managed by the platform's authentication. Passwords are never stored in plaintext; they're handled by the auth backend.</li>
        <li><strong>Your activity</strong> — library saves, watch positions and history, kept so you can resume across devices.</li>
        <li><strong>Your uploads</strong> — stored privately with their metadata until published or deleted.</li>
        <li><strong>Avatar</strong> — if you upload one, it's stored at a public URL so it can be displayed to you and others.</li>
      </ul>
      <h2>Who can see what</h2>
      <p>
        Your library, watch history, uploads and notifications are private to your account and enforced at the database
        level — other users can't read them. Public content is public; anything you upload stays private until a
        moderator approves it.
      </p>
      <h2>Your controls</h2>
      <ul>
        <li>Turn off watch-activity saving (Me → Preferences) for private viewing.</li>
        <li>Clear your watch history at any time from your profile.</li>
        <li>Remove items from your library whenever you like.</li>
      </ul>
      <h2>Deleting your data</h2>
      <p>
        You can clear watch history and library items yourself. For account deletion, contact the app owner through the
        channels on the <Link to="/contact">Contact</Link> page.
      </p>
    </StaticPage>
  );
}