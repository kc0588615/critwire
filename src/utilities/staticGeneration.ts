import { connection } from 'next/server'

export const shouldSkipBuildStaticGeneration = process.env.SKIP_BUILD_STATIC_GENERATION === '1'

export async function deferStaticGenerationIfRequested() {
  if (shouldSkipBuildStaticGeneration) {
    await connection()
  }
}
