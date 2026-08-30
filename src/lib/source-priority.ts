export interface VideoSourceIdentity {
  source?: string;
  source_name?: string;
  key?: string;
  name?: string;
}

const DYTT_NAME = '电影天堂';
const DYTT_SOURCE_KEY = 'dytt';

export function isDyttVideoSource(source: VideoSourceIdentity) {
  const sourceName = (source.source_name || source.name || '').replaceAll(
    ' ',
    ''
  );
  const sourceKey = (source.source || source.key || '').trim().toLowerCase();

  return sourceName.includes(DYTT_NAME) || sourceKey.includes(DYTT_SOURCE_KEY);
}

export function compareVideoSourcePriority(
  a: VideoSourceIdentity,
  b: VideoSourceIdentity
) {
  return Number(isDyttVideoSource(b)) - Number(isDyttVideoSource(a));
}

export function prioritizeVideoSources<T extends VideoSourceIdentity>(
  sources: readonly T[]
) {
  return sources.slice().sort(compareVideoSourcePriority);
}

export function findPreferredVideoSource<T extends VideoSourceIdentity>(
  sources: readonly T[]
) {
  return sources.find(isDyttVideoSource);
}

export function partitionVideoSourcesByPreference<
  T extends VideoSourceIdentity
>(sources: readonly T[]) {
  const preferred: T[] = [];
  const others: T[] = [];

  sources.forEach((source) => {
    (isDyttVideoSource(source) ? preferred : others).push(source);
  });

  return { preferred, others };
}
