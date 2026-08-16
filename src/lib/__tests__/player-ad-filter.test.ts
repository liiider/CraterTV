import fs from 'fs';
import path from 'path';

describe('player ad filter', () => {
  it('does not strip HLS discontinuity markers or expose the misleading control', () => {
    const playerSource = fs.readFileSync(
      path.join(process.cwd(), 'src/app/play/page.tsx'),
      'utf8'
    );

    expect(playerSource).not.toContain('filterAdsFromM3U8');
    expect(playerSource).not.toContain('#EXT-X-DISCONTINUITY');
    expect(playerSource).not.toContain('enable_blockad');
    expect(playerSource).not.toContain("html: '去广告'");
  });
});
