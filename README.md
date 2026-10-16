# VYBEX — Watch. Discover. Repeat.

VYBEX is a video streaming and discovery web app built on Base44: users browse a curated catalogue across categories (anime, animation, short videos, comedy, music, sports, movies, educational, kids), discover content from both VYBEX uploads and live YouTube results, and can keep authorized VYBEX media on their own device for offline viewing.

## Current features

- **Home** — cinematic hero carousel (featured titles), category rows, Continue Watching, Latest and Upcoming rows.
- **Search / Discovery** — unified search across VYBEX uploads and the YouTube Data API v3, with every result labeled by provider; server-side relevance, newest and title sorting; URL-persisted filters.
- **Reels** — TikTok-style vertical snap-scrolling short-form feed powered by the YouTube Data API (server-side discovery).
- **Watch pages** — player with resume-from-position, related videos, per-user watch progress, library save, and content reporting.
- **Library** — account-level bookmarks (separate from device downloads), including saved YouTube videos with links back to the source.
- **Downloads** — device-local offline copies for VYBEX-hosted videos whose uploader explicitly authorized downloads (see below).
- **Uploads & moderation** — authenticated creators upload media (stored privately), choose whether to authorize offline downloads, and submit for review; an admin moderation queue publishes/rejects/features submissions, manages reports, and edits metadata.
- **Notifications** — in-app notifications for moderation outcomes and system messages.
- **Accounts** — Base44-managed sign-in (email/password and social providers as configured), user profile page with watch history and upload status.

## Technologies and architecture

- **Frontend**: [TanStack Start](https://tanstack.com/start) (React 19, plain JavaScript) with file-based routes, server-rendered by default; Tailwind CSS + shadcn/ui components; Sora/Inter typography; VYBEX dark purple-and-red theme.
- **Backend**: Base44 platform —
  - Entities (JSON schemas with row-level security): `Video`, `LibraryItem`, `WatchProgress`, `ContentReport`, `Notification`, plus the built-in `User`.
  - Server functions in `src/lib/server-fns.js` (RPCs the pages call) and server-only modules such as `src/lib/providers.server.js` (YouTube integration) and `src/lib/downloads-client.js` / `downloads-store.js` (client download engine).
  - Server routes under `src/routes/api/`.
- **Hosting**: Cloudflare Workers via the Cloudflare Vite plugin (no `index.html`; the document is rendered from `src/routes/__root.jsx`).
- **Offline storage**: browser IndexedDB database `vybex-downloads` (separate `meta` and `files` stores) — download engine includes a stall watchdog and a completeness check, so a stalled or truncated transfer fails honestly with a retry option instead of hanging or saving a corrupt file.

## Configuration

Server-side secrets live in the Base44 **Secrets** configuration (never in files or code):

| Name (name only, by design) | Used for |
| --- | --- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 (search, video details, Reels discovery) |

Secrets are read in server code with `secrets.get("NAME")` from `base44:runtime` — never `process.env` and never committed.

`.gitignore` excludes environment files (`.env*`, `.dev.vars*`), dependency directories (`node_modules`), build output (`dist`, `.wrangler`, `.tanstack`), and the local `base44/.app.jsonc` link file.

## Running the project

```bash
npm ci
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev     # local backend + app together
```

```bash
npm run build  # -> dist/client (assets) + dist/server (the Worker)
```

The backend (entities, auth, storage, integrations) is provided by the Base44 platform — the app cannot run fully standalone without it.

## How the YouTube Data API integration works

- All YouTube calls (`src/lib/providers.server.js`) run **server-side**; the API key never reaches the browser.
- Search and Reels discovery fetch live results on each request; YouTube results are **never persisted** to the database and are always labeled with their provider.
- YouTube videos play through the official embedded player on dedicated provider watch pages; watch progress and library saves for them are stored per user with a link back to the source video.

### Restrictions on downloading YouTube videos

YouTube content is **not downloadable**. VYBEX offers no download button for provider videos; users can only save them to their Library, which links back to the YouTube watch page. VYBEX never downloads, copies, or re-hosts YouTube media.

## How authorized VYBEX media downloads work

1. A creator uploads a video through VYBEX (stored privately in Base44 storage) and explicitly enables **"Allow offline downloads"**.
2. Only when the video is **published + public + owner-authorized** will the server issue a download: it verifies the signed-in user, reads the record through row-level security, and returns a fresh, short-lived signed URL.
3. The client streams the file, verifies completeness against the announced size, and stores the bytes in the browser's IndexedDB on that device — metadata and file content in separate stores.
4. The Downloads page lists local copies and plays them from the stored file; deleting a local copy never affects the online original.

**Device-local caveats**: downloads live in browser storage on one device/browser profile, are not saved to the OS Downloads folder, and may be evicted by the browser/OS under storage pressure or when site data is cleared. Clearing VYBEX site data removes offline downloads.

## Known limitations

- **No native Android/iOS project exists** (no Capacitor/Cordova/Android build). The Android app is the published web app in a wrapper; downloads and offline playback inside it rely on the wrapper's browser storage with the same caveats above — there is no native file-system download, background downloading, or push notification support.
- **True offline playback has not been verified with networking fully disabled** in the test environment; the local-file playback path itself is implemented and the stored copy plays without a media request by construction.
- Download cancellation and retry-after-failure controls are implemented but have not been exhaustively end-to-end tested against every failure mode.
- Demo catalogue records use clearly-labeled public sample media and should be audited/replaced with licensed assets before production use.
- A benign hydration warning can appear on full page reload; anonymous calls to protected endpoints return a server error rather than a clean 401.