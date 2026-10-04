import pg from 'pg'

import { requireDisposableDatabase } from './env'

/**
 * The specs' only direct line to the E2E database, for what REST
 * deliberately can't do: put an acceptance or a timestamp into a past
 * state, or scan the whole database. Everything else goes through REST.
 * Each call opens and closes its own client, so no connection outlives it.
 */
async function withClient<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: requireDisposableDatabase() })
  await client.connect()
  try {
    return await run(client)
  } finally {
    await client.end()
  }
}

/**
 * Leaves `userID`'s acceptances as a version bump would: none of them is
 * for the current Terms any more. Fails unless the account had one.
 */
export async function ageLegalAcceptance(userID: number): Promise<void> {
  const { rowCount } = await withClient((client) =>
    client.query(`update legal_acceptances set terms_version = terms_version || '-old' where user_id = $1`, [userID]),
  )
  if (!rowCount) throw new Error(`ageLegalAcceptance: user ${userID} has no acceptance to age.`)
}
