/**
 * The one place rich text is styled. Every prose colour, the size and
 * the measure point at `--prose-*` variables that the surface's root
 * sets (`.fs-root` in portal.css; the marketing root from S18), so
 * `.prose` follows the page it sits on instead of assuming a dark or
 * light one. This block is appended after the plugin's defaults, so it
 * wins over them.
 *
 * @type {import('tailwindcss').Config}
 */
const config = {
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--prose-fg)',
            '--tw-prose-headings': 'var(--prose-fg)',
            '--tw-prose-links': 'var(--prose-fg)',
            '--tw-prose-bold': 'var(--prose-fg)',
            '--tw-prose-quotes': 'var(--prose-fg)',
            '--tw-prose-code': 'var(--prose-fg)',
            '--tw-prose-kbd': 'var(--prose-fg)',
            '--tw-prose-pre-code': 'var(--prose-fg)',
            '--tw-prose-lead': 'var(--prose-muted)',
            '--tw-prose-captions': 'var(--prose-muted)',
            '--tw-prose-counters': 'var(--prose-muted)',
            '--tw-prose-bullets': 'var(--prose-muted)',
            '--tw-prose-hr': 'var(--prose-border)',
            '--tw-prose-quote-borders': 'var(--prose-border)',
            '--tw-prose-th-borders': 'var(--prose-border)',
            '--tw-prose-td-borders': 'var(--prose-border)',
            '--tw-prose-kbd-shadows': 'var(--prose-border)',
            '--tw-prose-pre-bg': 'var(--prose-code-bg)',
            fontSize: 'var(--prose-size)',
            lineHeight: '1.6',
            maxWidth: 'var(--prose-measure)',
            a: {
              textDecorationColor: 'var(--prose-link-line)',
            },
          },
        },
      },
    },
  },
}

export default config
