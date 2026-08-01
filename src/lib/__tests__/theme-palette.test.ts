import fs from 'fs';
import path from 'path';

describe('site theme palettes', () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src/app/globals.css'),
    'utf8'
  );

  it('maps the light theme to the jade mint palette', () => {
    expect(css).toContain('--theme-background: 244 247 246;');
    expect(css).toContain('--theme-primary: 15 143 120;');
    expect(css).toContain('--theme-accent: 242 184 75;');
  });

  it('maps the dark theme to the cinema burgundy palette', () => {
    expect(css).toMatch(/html\.dark\s*{[\s\S]*--theme-background: 11 11 18;/);
    expect(css).toMatch(/html\.dark\s*{[\s\S]*--theme-primary: 225 29 72;/);
    expect(css).toMatch(/html\.dark\s*{[\s\S]*--theme-accent: 245 158 11;/);
  });

  it('does not use the legacy green, blue, or purple palette for interactions', () => {
    const interactiveFiles = [
      'src/app/admin/page.tsx',
      'src/app/search/page.tsx',
      'src/components/DataMigration.tsx',
      'src/components/EpisodeSelector.tsx',
      'src/components/MobileBottomNav.tsx',
      'src/components/MobileHeader.tsx',
      'src/components/MultiLevelSelector.tsx',
      'src/components/SearchResultFilter.tsx',
      'src/components/Sidebar.tsx',
      'src/components/ThemeToggle.tsx',
      'src/components/UserMenu.tsx',
    ];
    const interactiveSource = interactiveFiles
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(interactiveSource).not.toMatch(
      /(?:focus:ring|focus:border|hover:text|peer-checked:bg)-(?:green|blue|purple)-/
    );
    expect(interactiveSource).not.toMatch(
      /bg-(?:green|blue)-600 hover:bg-(?:green|blue)-700/
    );
    const roleInteractionSource = [
      'src/app/admin/page.tsx',
      'src/components/UserMenu.tsx',
    ]
      .map((file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(roleInteractionSource).not.toMatch(
      /(?:bg|text|border)-(?:purple|violet|indigo|fuchsia)-/
    );
  });
});
