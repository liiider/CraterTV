import { settleRecommendations } from '../home-recommendations';

describe('settleRecommendations', () => {
  it('keeps successful recommendation sections when one request fails', async () => {
    const results = await settleRecommendations({
      movies: Promise.resolve(['movie']),
      tvShows: Promise.reject(new Error('tv request failed')),
      varietyShows: Promise.resolve(['variety']),
      animes: Promise.resolve(['anime']),
    });

    expect(results.movies).toEqual(['movie']);
    expect(results.tvShows).toBeUndefined();
    expect(results.varietyShows).toEqual(['variety']);
    expect(results.animes).toEqual(['anime']);
  });
});
