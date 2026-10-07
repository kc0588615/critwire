// `pnpm generate:theme`: writes cw's tokens from cw.ts to src/styles/cw-tokens.css.
// Rerun after changing cw.ts, and commit the result.
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { cwTokensCSS } from './tokensCss'

writeFileSync(path.join(import.meta.dirname, '../../styles/cw-tokens.css'), cwTokensCSS())
