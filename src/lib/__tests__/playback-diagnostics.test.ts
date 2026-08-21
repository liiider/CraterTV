import {
  describeDiagnosticError,
  sanitizePlaybackUrl,
} from '@/lib/playback-diagnostics';

describe('playback diagnostics', () => {
  it('removes query parameters, fragments, and credentials from URLs', () => {
    expect(
      sanitizePlaybackUrl(
        'https://user:secret@media.example.com/video/index.m3u8?token=abc#part'
      )
    ).toBe('https://media.example.com/video/index.m3u8');
  });

  it('removes query parameters from relative URLs', () => {
    expect(sanitizePlaybackUrl('/proxy/m3u8?id=secret#part')).toBe(
      '/proxy/m3u8'
    );
  });

  it('converts unknown errors to text', () => {
    expect(describeDiagnosticError(new Error('failed'))).toBe('failed');
    expect(describeDiagnosticError({ reason: 'failed' })).toBe(
      '{"reason":"failed"}'
    );
  });
});
