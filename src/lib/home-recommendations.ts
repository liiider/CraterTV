export type HomeRecommendationSection =
  | 'movies'
  | 'tvShows'
  | 'varietyShows'
  | 'animes';

type RecommendationRequests<T> = Record<HomeRecommendationSection, Promise<T>>;
type RecommendationResults<T> = Record<
  HomeRecommendationSection,
  T | undefined
>;

export async function settleRecommendations<T>(
  requests: RecommendationRequests<T>,
  onRejected?: (section: HomeRecommendationSection, reason: unknown) => void
): Promise<RecommendationResults<T>> {
  const sections: HomeRecommendationSection[] = [
    'movies',
    'tvShows',
    'varietyShows',
    'animes',
  ];
  const settledResults = await Promise.allSettled(
    sections.map((section) => requests[section])
  );
  const [movies, tvShows, varietyShows, animes] = settledResults;

  const getValue = (
    section: HomeRecommendationSection,
    settledResult: PromiseSettledResult<T>
  ): T | undefined => {
    if (settledResult.status === 'fulfilled') {
      return settledResult.value;
    }

    onRejected?.(section, settledResult.reason);
    return undefined;
  };

  return {
    movies: getValue('movies', movies),
    tvShows: getValue('tvShows', tvShows),
    varietyShows: getValue('varietyShows', varietyShows),
    animes: getValue('animes', animes),
  };
}
