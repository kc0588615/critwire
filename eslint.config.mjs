import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

// New react-hooks v6 rules flag patterns in template-shipped demo
// components (Theme provider, Header, Card). Downgraded until that
// code is replaced in Phases 2-3; keep new code clean regardless.
// Flat config scopes plugin rules to the object declaring the plugin,
// so the override is injected into the config objects that define it.
const downgradeReactHooksRules = (configs) =>
  configs.map((cfg) =>
    cfg.plugins?.['react-hooks']
      ? {
          ...cfg,
          rules: {
            ...cfg.rules,
            'react-hooks/refs': 'warn',
            'react-hooks/set-state-in-effect': 'warn',
          },
        }
      : cfg,
  )

const eslintConfig = [
  ...downgradeReactHooksRules(nextCoreWebVitals),
  ...nextTypescript,
  {
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false,
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: [
      '.next/',
      'src/payload-types.ts',
      'src/payload-generated-schema.ts',
      // Playwright output: the HTML report bundles its own trace viewer.
      'playwright-report/',
      'test-results/',
    ],
  },
]

export default eslintConfig
