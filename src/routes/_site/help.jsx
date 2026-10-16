import { createFileRoute, Link } from "@tanstack/react-router";
import StaticPage from "@/components/StaticPage";

export const Route = createFileRoute("/_site/help")({
  head: () => ({ meta: [{ title: "Help — VYBEX" }] }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <StaticPage title="Help" lead="Quick answers to the most common questions about using VYBEX.">
      <h2>Do I need an account?</h2>
      <p>
        Browsing, searching and watching public content works without signing in. An account unlocks your Library,
        Continue Watching, uploads, downloads info, notifications and preferences.
      </p>
      <h2>Where do my saved titles live?</h2>
      <p>
        Everything you save or watch while signed in is tied to your account and available on any device after you sign
        in again. You can clear your watch history any time from your profile.
      </p>
      <h2>Why does a title say “Video unavailable”?</h2>
      <p>
        Some titles — especially announced, upcoming ones — don't have a playable source yet. We show their details and
        artwork honestly rather than pretending something plays. Titles badged <strong>Demo</strong> stream from public
        sample media.
      </p>
      <h2>Can I download videos for offline viewing?</h2>
      <p>
        VYBEX streams online. Offline downloads aren't guaranteed: the <Link to="/downloads">Downloads</Link> page offers
        a save option only where the media source and your device allow it, and explains the limits honestly.
      </p>
      <h2>How do uploads work?</h2>
      <p>
        Signed-in users can upload videos they own or are authorised to share. Uploads are stored privately and are
        reviewed by a moderator before appearing in public discovery. Track status under Me → My Uploads.
      </p>
      <h2>How do I report a problem title?</h2>
      <p>
        Use the report link on any title's page or the <Link to="/report">Report Content</Link> form. For account issues,
        sign in and check your profile settings.
      </p>
    </StaticPage>
  );
}