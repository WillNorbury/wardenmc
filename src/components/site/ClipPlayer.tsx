import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function timestamp(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}

export default function ClipPlayer({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState("1");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video || failed) return;
    if (!video.paused) video.pause();
    else {
      try { await video.play(); } catch { setWaiting(false); }
    }
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.max(0, Math.min(duration, value));
    setTime(video.currentTime);
  }

  async function toggleFullscreen() {
    const frame = frameRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (frame?.requestFullscreen) await frame.requestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch { video?.webkitEnterFullscreen?.(); }
  }

  return <div ref={frameRef} className="clip-player overflow-hidden bg-background text-foreground" role="region" aria-label={`${title} video player`} onKeyDown={event => {
    if (event.target !== event.currentTarget) return;
    if (event.key === " " || event.key === "k") { event.preventDefault(); void togglePlayback(); }
    if (event.key === "ArrowRight") { event.preventDefault(); seek(time + 5); }
    if (event.key === "ArrowLeft") { event.preventDefault(); seek(time - 5); }
  }} tabIndex={0}>
    <div className="clip-player-screen relative flex aspect-video items-center justify-center bg-muted">
      <video ref={videoRef} src={src} playsInline preload="metadata" aria-label={title} className="h-full w-full object-contain" onClick={() => void togglePlayback()} onDoubleClick={() => void toggleFullscreen()}
        onLoadedMetadata={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={event => setTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)} onPlaying={() => setWaiting(false)} onCanPlay={() => setWaiting(false)} onError={() => { setFailed(true); setWaiting(false); }} />
      {failed ? <p role="alert" className="absolute inset-0 flex items-center justify-center bg-background/90 px-8 text-center text-sm text-muted-foreground">This video could not play. Try another browser or an MP4 version.</p>
        : waiting ? <Loader2 aria-label="Buffering" className="pointer-events-none absolute h-10 w-10 animate-spin text-primary" />
        : !playing && <Button size="icon" title={time >= duration && duration > 0 ? "Replay" : "Play"} aria-label={time >= duration && duration > 0 ? "Replay video" : "Play video"} className="absolute h-16 w-16 rounded-full shadow-elegant [&_svg]:size-7" onClick={() => void togglePlayback()}>{time >= duration && duration > 0 ? <RotateCcw /> : <Play className="ml-1" />}</Button>}
    </div>
    <div className="space-y-2 border-t border-border bg-card px-3 pt-4 pb-2 sm:px-5">
      <Slider aria-label="Seek video" value={[time]} max={duration || 1} step={0.1} disabled={!duration || failed} onValueChange={([value]) => seek(value)} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_span[data-orientation=horizontal]]:h-1" />
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <Button variant="ghost" size="icon" title={playing ? "Pause" : "Play"} aria-label={playing ? "Pause video" : "Resume video"} disabled={failed} onClick={() => void togglePlayback()}>{playing ? <Pause /> : <Play />}</Button>
        <Button variant="ghost" size="icon" title={muted ? "Unmute" : "Mute"} aria-label={muted ? "Unmute" : "Mute"} onClick={() => { const video = videoRef.current; if (video) { video.muted = !video.muted; setMuted(video.muted); } }}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</Button>
        <Slider aria-label="Volume" value={[muted ? 0 : volume]} max={1} step={0.05} className="mr-2 hidden max-w-20 sm:flex [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" onValueChange={([value]) => { const video = videoRef.current; if (video) { video.volume = value; video.muted = false; setVolume(value); setMuted(false); } }} />
        <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">{timestamp(time)} <span className="px-0.5">/</span> {timestamp(duration)}</span>
        <div className="ml-auto flex items-center gap-1">
          <Select value={rate} onValueChange={value => { if (videoRef.current) videoRef.current.playbackRate = Number(value); setRate(value); }}><SelectTrigger aria-label="Playback speed" title="Playback speed" className="h-9 w-[72px] border-none bg-transparent px-2 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["0.5", "0.75", "1", "1.25", "1.5", "2"].map(speed => <SelectItem key={speed} value={speed}>{speed}×</SelectItem>)}</SelectContent></Select>
          <Button variant="ghost" size="icon" title={fullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize /> : <Maximize />}</Button>
        </div>
      </div>
    </div>
  </div>;
}