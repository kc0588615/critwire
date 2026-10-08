// `pnpm generate:theme`: writes the theme's tokens from tokens.ts to src/styles/tokens.css.
// Rerun after changing tokens.ts, and commit the result.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { tokensCSS } from './tokensCss'

writeFileSync(path.join(import.meta.dirname, '../../styles/tokens.css'), tokensCSS())
