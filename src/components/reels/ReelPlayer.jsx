import { useEffect, useRef, useState } from "react";
import { Loader2, Play, Volume2, VolumeX } from "lucide-react";
import ReelUnavailable from "./ReelUnavailable";

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("YouTube player failed to load"));
      document.head.appendChild(script);
    });
  }
  return ytApiPromise;
}

/**
 * One reel's YouTube player (official iframe API). The feed only mounts the
 * active reel and its neighbours; only the active reel plays. Playback starts
 * muted to comply with autoplay rules, and the player plus its listeners are
 * fully destroyed on unmount or when the reel scrolls far away.
 */
export default function ReelPlayer({ videoId, title, active, embeddable, watchUrl }) {
  const wrapperRef = useRef(null);
  const playerRef = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let destroyed = false;
    let progressTimer = null;
    loadYouTubeApi()
      .then((YT) => {
        if (destroyed || !wrapperRef.current) return;
        const mountEl = document.createElement("div");
        wrapperRef.current.appendChild(mountEl);
        playerRef.current = new YT.Player(mountEl, {
          videoId,
          playerVars: { rel: 0, playsinline: 1, mute: 1, autoplay: 0, modestbranding: 1 },
          events: {
            onReady: (event) => {
              if (destroyed) return;
              setReady(true);
              event.target.mute();
              if (activeRef.current) event.target.playVideo();
            },
            onError: () => !destroyed && setFailed(true),
            onStateChange: (event) => !destroyed && setPlaying(event.data === YT.PlayerState.PLAYING),
          },
        });
        progressTimer = setInterval(() => {
          const player = playerRef.current;
          if (!player?.getCurrentTime) return;
          const duration = player.getDuration?.() ?? 0;
          if (duration > 0) setProgress(Math.min(1, (player.getCurrentTime?.() ?? 0) / duration));
        }, 500);
      })
      .catch(() => !destroyed && setFailed(true));
    return () => {
      destroyed = true;
      if (progressTimer) clearInterval(progressTimer);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* player already gone */
      }
      playerRef.current = null;
      wrapperRef.current?.replaceChildren?.();
    };
  }, [videoId]);

  // Follow the feed's notion of the active reel: play when active, pause otherwise.
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !player) return;
    if (active) player.playVideo?.();
    else player.pauseVideo?.();
  }, [active, ready]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pauseVideo();
    else player.playVideo();
  };

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      setMuted(false);
    } else {
      player.mute();
      setMuted(true);
    }
  };

  // Keyboard shortcuts (Space = play/pause, M = mute) and pausing when the
  // browser tab is hidden — only while this reel is the active one.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    const onVisibility = () => {
      const player = playerRef.current;
      if (document.hidden) player?.pauseVideo?.();
      else if (activeRef.current && playing) player?.playVideo?.();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, playing, ready, muted]);

  if (failed) return <ReelUnavailable watchUrl={watchUrl} />;

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={wrapperRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading video</span>
        </div>
      )}

      {/* Tap layer: toggles playback anywhere on the video. */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause video" : "Play video"}
        className="absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />

      {!playing && ready && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
            <Play className="ml-1 h-7 w-7 fill-current text-foreground" aria-hidden="true" />
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute video" : "Mute video"}
        className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-foreground backdrop-blur-sm transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
      </button>

      {/* Playback progress */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/25"
        role="progressbar"
        aria-label="Video progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}