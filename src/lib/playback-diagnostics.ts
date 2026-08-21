export type PlaybackDiagnosticEvent = {
  at: number;
  name: string;
  details?: Record<string, unknown>;
};

export function sanitizePlaybackUrl(value: string): string {
  if (!value) return '';

  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

export function getMediaSnapshot(video: HTMLVideoElement | null) {
  if (!video) return null;

  const buffered: Array<{ start: number; end: number }> = [];
  try {
    for (let index = 0; index < video.buffered.length; index += 1) {
      buffered.push({
        start: Number(video.buffered.start(index).toFixed(3)),
        end: Number(video.buffered.end(index).toFixed(3)),
      });
    }
  } catch {
    // Safari may invalidate TimeRanges while the media source is changing.
  }

  return {
    currentTime: Number(video.currentTime.toFixed(3)),
    duration: Number.isFinite(video.duration)
      ? Number(video.duration.toFixed(3))
      : null,
    paused: video.paused,
    ended: video.ended,
    seeking: video.seeking,
    readyState: video.readyState,
    networkState: video.networkState,
    playbackRate: video.playbackRate,
    buffered,
  };
}

export function describeDiagnosticError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
