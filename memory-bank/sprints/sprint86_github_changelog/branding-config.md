# Branding & Repo Config

## Repo-level config
- `.bazaar.yml` at repo root (preferred) or `_brand.yml` legacy style.

### Suggested schema
```yaml
brand:
  colors: ['#0F1113', '#1A1C1F', '#3AA3FF']
  fontFamily: 'Inter'
  logo: './public/logo.svg'
  style: 'apple-minimal' # or 'branded', 'corporate', etc.
video:
  defaultDuration: 8
  style: 'apple-minimal'
  voiceover: false
rules:
  includeFiles: ['apps/web/**', 'packages/player/**']
  excludeFiles: ['**/*.test.*', '**/*.md']
```

## Auto-detection fallbacks
- Tailwind/CSS tokens for primary colors.
- Public assets: `public/logo.svg|png`.
- README/homepage primary color sniff as last resort.

## Overrides
- Command options override config (e.g., `duration=8s`, `style=apple`).
