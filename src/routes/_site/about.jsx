import { createFileRoute, Link } from "@tanstack/react-router";
import StaticPage from "@/components/StaticPage";

export const Route = createFileRoute("/_site/about")({
  head: () => ({ meta: [{ title: "About — VYBEX" }] }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <StaticPage
      title="About VYBEX"
      lead="A place to discover and watch videos across the moods and genres you love — built as a demonstration of a modern streaming experience."
    >
      <p>
        VYBEX brings anime, animation, short videos, comedy, music, sports highlights, movies and trailers, and
        educational content together in one clean, fast interface. You can browse by category, search the catalogue,
        build a personal library, and pick up where you left off.
      </p>
      <h2>Honest about content</h2>
      <p>
        This build is seeded with a small number of <strong>clearly labeled demo titles</strong> streamed from public
        sample media (Blender Foundation open movies and Google's public sample clips). Nothing here is a licensed
        commercial catalogue, and we never present demo records as real programming. The platform is designed to be
        filled with:
      </p>
      <ul>
        <li>Public-domain or Creative Commons media with attribution</li>
        <li>Media the platform owner licenses or owns</li>
        <li>Authorised provider embeds</li>
        <li>User uploads, which pass review before public release</li>
      </ul>
      <h2>What works right now</h2>
      <ul>
        <li>Discovery: home carousel, category tabs, rows, search and category pages</li>
        <li>Playback with progress saving and Continue Watching (sign in required)</li>
        <li>A personal library, notifications, and an upload pipeline with moderation</li>
      </ul>
      <p>
        Found something that shouldn't be here? <Link to="/report">Report it</Link> and our review team will take a look.
      </p>
    </StaticPage>
  );
}