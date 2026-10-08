/**
 * The one place rich text is styled. Every prose colour, the body size,
 * its leading and the measure point at `--prose-*` variables that the
 * surface's root sets (`.cw-root` in site.css, `.fs-root` in
 * portal.css), so `.prose` follows the page it sits on instead of
 * assuming a dark or light one. The headings, the gaps and the faces are
 * cc's steps and roles. This block is appended after the
 * plugin's defaults, so it wins over them.
 *
 * @type {import('tailwindcss').Config}
 */
const heading = (step) => ({
  fontSize: `var(--size-${step})`,
  fontWeight: 'var(--weight-brand-heavy)',
  letterSpacing: `var(--letter-spacing-${step})`,
  lineHeight: `var(--line-${step})`,
  marginBottom: 'var(--space-m)',
  marginTop: 'var(--space-l)',
})

const gap = { marginBottom: 'var(--space-m)', marginTop: 'var(--space-m)' }

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
            lineHeight: 'var(--prose-line)',
            maxWidth: 'var(--prose-measure)',
            h1: heading('xl'),
            h2: heading('l'),
            h3: heading('m'),
            h4: heading('m'),
            p: { ...gap, fontFamily: 'var(--font-editorial)' },
            // One key per element, as the plugin names them, so its
            // `> :first-child` rule (later in its order) still zeroes the top gap.
            ul: gap,
            ol: gap,
            blockquote: gap,
            pre: gap,
            figure: gap,
            table: gap,
            li: { marginBottom: 'var(--space-xs)', marginTop: 'var(--space-xs)' },
            'code, kbd, pre': { fontFamily: 'var(--font-data)' },
            // Inline code (GUI.md D18): the data face a step down, regular,
            // in an n4-edged chip in place of the plugin's backticks.
            code: {
              border: 'var(--stroke-s) solid var(--prose-border)',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.875em',
              fontWeight: 'var(--weight-data-regular)',
              padding: '0 var(--space-xxs)',
            },
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
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
