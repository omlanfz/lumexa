'use client';

// FILE PATH: client/components/little-coders/LearningPreview.tsx
//
// "Your Learning Preview": the 60–100 second video at the top of every Little Coders lesson, with
// proper controls — play / pause, a seek bar with a marker for every scene, jump-to-scene buttons,
// volume, speed, subtitles (when the video has a subtitle file), fullscreen and keyboard shortcuts.
//
// The video itself is kept in Lumexa's lesson-video storage (uploaded by an admin or by the bulk tool).
// Until a lesson has one, the page says so honestly — it never shows a player for a video that does
// not exist.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Captions, Maximize, Minimize, Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from 'lucide-react';
import type { LcPreviewVideoPublic } from '@/lib/littleCoders/types';
import {
  actionForKey,
  chapterIndexAt,
  chapterMarkers,
  chapterTarget,
  clampTime,
  formatTime,
  nextSpeed,
  speedLabel,
  type PlayerAction,
} from '@/lib/littleCoders/player';

const BUTTON =
  'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-300 disabled:opacity-40';

/** The subtitle track of a video (there is at most one), and the two things done to it. */
const subtitleTrack = (video: HTMLVideoElement | null): TextTrack | undefined => video?.textTracks?.[0];
/** A track only loads while it is "hidden" or "showing": hidden loads the file without drawing it. */
function loadSubtitlesQuietly(video: HTMLVideoElement | null): void {
  const track = subtitleTrack(video);
  if (track && track.mode === 'disabled') track.mode = 'hidden';
}
/** Shows or hides the subtitles; returns whether they are showing now. */
function flipSubtitles(video: HTMLVideoElement | null): boolean | null {
  const track = subtitleTrack(video);
  if (!track) return null;
  const on = track.mode !== 'showing';
  track.mode = on ? 'showing' : 'hidden';
  return on;
}

type FullscreenCapable = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };
type IosVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

function Player({ video, title, onFailed }: { video: LcPreviewVideoPublic; title: string; onFailed: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds ?? 0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [captionsReady, setCaptionsReady] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);

  const chapters = useMemo(() => video.chapters ?? [], [video.chapters]);
  const markers = useMemo(() => chapterMarkers(chapters, duration), [chapters, duration]);
  const currentChapter = chapterIndexAt(chapters, time);
  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  // A subtitle track only loads while it is "hidden" or "showing": hidden lets it load without drawing.
  const hideTrack = useCallback(() => loadSubtitlesQuietly(videoRef.current), []);

  useEffect(() => {
    hideTrack();
  }, [hideTrack]);

  // React does not pass a <track>'s "load" event on, so listen for it directly. The subtitle button only
  // appears once the file really loaded (a subtitle file the browser is not allowed to read is skipped).
  const trackRef = useCallback((el: HTMLTrackElement | null) => {
    if (!el) return;
    const loaded = () => setCaptionsReady(true);
    el.addEventListener('load', loaded);
    if (el.readyState === 2) loaded();
    return () => el.removeEventListener('load', loaded);
  }, []);

  useEffect(() => {
    const onChange = () => {
      const d = document as FullscreenDocument;
      setFullscreen((d.fullscreenElement ?? d.webkitFullscreenElement) === boxRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const box = boxRef.current as FullscreenCapable | null;
    const v = videoRef.current as IosVideo | null;
    const d = document as FullscreenDocument;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        await (d.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      } else if (box?.requestFullscreen) {
        await box.requestFullscreen();
      } else if (box?.webkitRequestFullscreen) {
        await box.webkitRequestFullscreen();
      } else {
        v?.webkitEnterFullscreen?.(); // iPhone Safari can only put the video itself in fullscreen
      }
    } catch {
      /* the browser said no (a permissions policy, for example) — nothing to do */
    }
  }, []);

  const toggleCaptions = useCallback(() => {
    const on = flipSubtitles(videoRef.current);
    if (on !== null) setCaptionsOn(on);
  }, []);

  const apply = useCallback(
    (action: PlayerAction) => {
      const v = videoRef.current;
      if (!v) return;
      const total = v.duration;
      switch (action.type) {
        case 'toggle':
          if (v.paused || v.ended) void v.play().catch(() => undefined);
          else v.pause();
          break;
        case 'seekBy':
          v.currentTime = clampTime(v.currentTime + action.seconds, total);
          break;
        case 'seekToPercent':
          if (Number.isFinite(total)) v.currentTime = clampTime((total * action.percent) / 100, total);
          break;
        case 'seekToStart':
          v.currentTime = 0;
          break;
        case 'seekToEnd':
          if (Number.isFinite(total)) v.currentTime = Math.max(0, total - 0.1);
          break;
        case 'volumeBy':
          v.muted = false;
          v.volume = Math.min(1, Math.max(0, Math.round((v.volume + action.delta) * 10) / 10));
          break;
        case 'mute':
          v.muted = !v.muted;
          break;
        case 'fullscreen':
          void toggleFullscreen();
          break;
        case 'captions':
          if (captionsReady) toggleCaptions();
          break;
        case 'chapter': {
          const target = chapterTarget(chapters, v.currentTime, action.delta);
          if (target !== null) v.currentTime = target;
          break;
        }
      }
    },
    [captionsReady, chapters, toggleCaptions, toggleFullscreen],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // A focused button keeps its own Space / Enter (they press it); everything else is a shortcut.
    if ((e.key === ' ' || e.key === 'Enter') && (e.target as HTMLElement).closest('button')) return;
    const action = actionForKey(e.key, { ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey });
    if (!action) return;
    e.preventDefault();
    apply(action);
  };

  const seekTo = (seconds: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = clampTime(seconds, v.duration);
  };

  const onSeekBarClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && duration > 0) seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      role="group"
      aria-label={`${title} — video player. Space plays or pauses, the arrow keys skip and change the volume, F is fullscreen, M mutes.`}
      onKeyDown={onKeyDown}
      className={`bg-black outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-300 ${fullscreen ? 'flex h-full w-full flex-col' : ''}`}
    >
      <div className={`relative ${fullscreen ? 'min-h-0 flex-1' : 'aspect-video'}`}>
        <video
          ref={videoRef}
          className={`block w-full bg-black ${fullscreen ? 'h-full object-contain' : 'aspect-video'}`}
          src={video.videoUrl}
          poster={video.posterUrl || undefined}
          playsInline
          preload="metadata"
          aria-label={`${title}: ${video.summary}`}
          onClick={() => apply({ type: 'toggle' })}
          onPlay={() => {
            setPlaying(true);
            setStarted(true);
            setEnded(false);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setEnded(true);
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onSeeked={(e) => {
            setTime(e.currentTarget.currentTime);
            if (e.currentTarget.currentTime < e.currentTarget.duration - 0.2) setEnded(false);
          }}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            hideTrack();
          }}
          onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
          onError={onFailed}
        >
          {video.captionsUrl ? <track ref={trackRef} kind="captions" src={video.captionsUrl} srcLang="en" label="English" /> : null}
        </video>

        {(!started || ended) && (
          <button
            type="button"
            onClick={() => apply({ type: 'toggle' })}
            aria-label={ended ? 'Watch the preview again' : 'Play the preview video'}
            className="absolute inset-0 flex items-center justify-center bg-black/25 transition hover:bg-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 text-violet-700 shadow-xl sm:h-24 sm:w-24">
              {ended ? <RotateCcw className="h-9 w-9" aria-hidden="true" /> : <Play className="ml-1 h-10 w-10 fill-current" aria-hidden="true" />}
            </span>
          </button>
        )}
      </div>

      <div className="space-y-1 bg-gray-900 px-3 pb-2 pt-3 text-white">
        {/* Seek bar: a marker for every scene of the video */}
        <div
          className="group relative h-5 cursor-pointer touch-none"
          onClick={onSeekBarClick}
          data-testid="seek-bar"
        >
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/25 group-hover:h-2">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-teal-300" style={{ width: `${percent}%` }} />
          </div>
          {markers.map((m) => (
            <span
              key={m.label + m.percent}
              title={m.label}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded bg-white/90"
              style={{ left: `${m.percent}%` }}
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${percent}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(time, duration > 0 ? duration : 0)}
            disabled={!(duration > 0)}
            onChange={(e) => seekTo(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            aria-label="Seek"
            aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <button
            type="button"
            onClick={() => apply({ type: 'toggle' })}
            className={BUTTON}
            aria-label={playing ? 'Pause' : ended ? 'Replay' : 'Play'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing ? <Pause className="h-5 w-5 fill-current" aria-hidden="true" /> : ended ? <RotateCcw className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
          </button>
          <button type="button" onClick={() => apply({ type: 'mute' })} className={BUTTON} aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} title="Mute (M)">
            <VolumeIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => {
              const v = videoRef.current;
              if (!v) return;
              v.volume = Number(e.target.value);
              v.muted = Number(e.target.value) === 0;
            }}
            aria-label="Volume"
            className="hidden h-1.5 w-20 cursor-pointer accent-teal-300 sm:block"
          />
          <span className="ml-1 select-none text-xs tabular-nums text-white/90" aria-hidden="true">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          {chapters.length > 0 && currentChapter >= 0 ? (
            <span className="ml-2 hidden truncate text-xs font-semibold text-teal-200 md:inline">
              {currentChapter + 1}. {chapters[currentChapter].label}
            </span>
          ) : null}

          <span className="flex-1" />

          <button
            type="button"
            onClick={() => videoRef.current && (videoRef.current.playbackRate = nextSpeed(speed))}
            className={BUTTON}
            aria-label={`Playback speed ${speedLabel(speed)}. Change speed`}
            title="Playback speed"
          >
            {speedLabel(speed)}
          </button>
          {captionsReady ? (
            <button type="button" onClick={toggleCaptions} className={`${BUTTON} ${captionsOn ? 'bg-white/20' : ''}`} aria-label="Subtitles" aria-pressed={captionsOn} title="Subtitles (C)">
              <Captions className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" onClick={() => apply({ type: 'fullscreen' })} className={BUTTON} aria-label={fullscreen ? 'Leave fullscreen' : 'Fullscreen'} title="Fullscreen (F)">
            {fullscreen ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {chapters.length > 1 && !fullscreen ? (
        <nav aria-label="Jump to a part of the video" className="flex flex-wrap items-center gap-1.5 bg-gray-900 px-3 pb-3">
          <span className="mr-1 text-xs font-semibold text-white/70">Jump to</span>
          {chapters.map((c, i) => (
            <button
              key={c.label + c.start}
              type="button"
              onClick={() => {
                seekTo(c.start);
                void videoRef.current?.play().catch(() => undefined);
              }}
              aria-current={i === currentChapter ? 'true' : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-300 ${
                i === currentChapter ? 'bg-teal-300 text-gray-900' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {i + 1}. {c.label}
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

export default function LearningPreview({
  video,
  emoji,
  objective,
}: {
  video: LcPreviewVideoPublic | null;
  emoji: string;
  /** What the lesson is about — shown while the video is not there yet. */
  objective: string;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasVideo = !!video?.videoUrl && !failed;
  const title = video?.title || 'Your Learning Preview';

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm dark:border-violet-500/30 dark:bg-gray-800/60">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600 to-teal-500 px-4 py-2.5 text-white">
        <h3 className="flex items-center gap-2 text-sm font-bold sm:text-base">
          <span aria-hidden="true">🎬</span> {title}
        </h3>
        {video?.durationSeconds ? <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{formatTime(video.durationSeconds)}</span> : null}
      </div>

      {hasVideo ? (
        <Player key={`${video!.videoUrl}#${attempt}`} video={video!} title={title} onFailed={() => setFailed(true)} />
      ) : (
        <div
          className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 via-violet-50 to-teal-50 px-6 text-center dark:from-gray-900 dark:via-indigo-950 dark:to-gray-900"
          role="img"
          aria-label={failed ? 'The preview video could not be loaded' : 'The preview video is coming soon'}
        >
          <span className="text-6xl sm:text-7xl" aria-hidden="true">
            {emoji}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-semibold text-violet-800 shadow-sm dark:bg-white/10 dark:text-violet-200">
            <span aria-hidden="true">{failed ? '⚠️' : '⏳'}</span> {failed ? 'The video could not be loaded.' : 'Video coming soon'}
          </span>
          {failed ? (
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setAttempt((a) => a + 1);
              }}
              className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
            >
              Try again
            </button>
          ) : null}
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">In this lesson:</span> {objective}
          </p>
          {failed ? <p className="max-w-md text-xs text-gray-500 dark:text-gray-400">Still stuck? Reload the page — the video link is refreshed each time the lesson opens.</p> : null}
        </div>
      )}

      {video?.summary ? <p className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{video.summary}</p> : null}
    </div>
  );
}
