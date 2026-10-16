import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { formatDuration } from "@/lib/format";

function UnavailableState({ poster }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card">
      {poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" aria-hidden="true" />}
      <div className="relative flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-sm font-semibold text-foreground">Video unavailable</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          This title has no playable source yet. Its details and artwork are shown for discovery.
        </p>
      </div>
    </div>
  );
}

export default function VideoPlayer({ src, poster, startAt = 0, autoPlay = false, onProgress, onEnded }) {
  const videoRef = useRef(null);
  const lastSaved = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setFailed(false);
    setPlaying(false);
    setTime(0);
    setDuration(0);
    lastSaved.current = 0;
    const v = videoRef.current;
    if (!v || !startAt || startAt < 2) return;
    const seek = () => {
      v.currentTime = v.duration ? Math.min(startAt, Math.max(0, v.duration - 2)) : startAt;
      v.removeEventListener("loadedmetadata", seek);
    };
    v.addEventListener("loadedmetadata", seek);
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [src, startAt]);

  const report = useCallback(
    (completed = false) => {
      const v = videoRef.current;
      if (onProgress && v && v.currentTime > 0) {
        onProgress({ position: v.currentTime, duration: v.duration || 0, completed });
      }
    },
    [onProgress],
  );

  useEffect(() => {
    if (!autoPlay) return;
    const v = videoRef.current;
    if (!v) return;
    const start = () => {
      v.play().catch(() => {});
      v.removeEventListener("loadedmetadata", start);
    };
    v.addEventListener("loadedmetadata", start);
    return () => v.removeEventListener("loadedmetadata", start);
  }, [src, autoPlay]);

  // Save the last position when the player unmounts (e.g. navigating away mid-playback).
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && !v.paused) {
        v.pause();
        report();
      }
    };
  }, [report]);

  if (!src) return <UnavailableState poster={poster} />;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          // Autoplay policy blocked unmuted playback — start muted instead of showing a false media error.
          v.muted = true;
          setMuted(true);
          v.play().catch(() => setFailed(true));
        } else {
          setFailed(true);
        }
      });
    } else v.pause();
  };

  const retry = () => {
    setFailed(false);
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  };

  const seek = (value) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setTime(value);
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else v.requestFullscreen?.().catch(() => {});
  };

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "k") {
          e.preventDefault();
          togglePlay();
        }
        if (e.key === "m") {
          const v = videoRef.current;
          if (v) {
            v.muted = !v.muted;
            setMuted(v.muted);
          }
        }
      }}
      aria-label="Video player. Press space to play or pause."
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        className="h-full w-full"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); report(); }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setTime(v.currentTime);
          if (v.currentTime - lastSaved.current > 5) {
            lastSaved.current = v.currentTime;
            report();
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          setPlaying(false);
          report(true);
          onEnded?.();
        }}
        onError={() => {
          setFailed(true);
          report();
        }}
      />

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">Playback error</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            The video could not be played. It may be temporarily unavailable or in an unsupported format.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : (
        <>
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-glow transition-transform hover:scale-105">
                <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
              </span>
            </button>
          )}
          <div className={`absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 transition-opacity ${playing ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"}`}>
            <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="rounded p-1 text-foreground hover:text-primary">
              {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
            </button>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek position"
              className="h-1 flex-1 cursor-pointer accent-primary"
            />
            <span className="shrink-0 text-[11px] tabular-nums text-foreground/90">
              {formatDuration(time)} / {formatDuration(duration)}
            </span>
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current;
                if (v) {
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className="rounded p-1 text-foreground hover:text-primary"
            >
              {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" className="rounded p-1 text-foreground hover:text-primary">
              <Maximize className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}