import {
  commitTransaction,
  createLocalReq,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

/**
 * Runs `fn` in one database transaction: every Local API call that passes
 * the given `req` joins it. Commits when `fn` resolves and rolls back when
 * it throws, then rethrows.
 */
export async function withTransaction<T>(
  payload: Payload,
  fn: (req: PayloadRequest) => Promise<T>,
): Promise<T> {
  const req = await createLocalReq({}, payload)
  await initTransaction(req)
  try {
    const result = await fn(req)
    await commitTransaction(req)
    return result
  } catch (error) {
    await killTransaction(req)
    throw error
  }
}
