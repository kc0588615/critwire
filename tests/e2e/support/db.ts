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

/**
 * How many rows, across every table in the database, hold `needle` in
 * their text form, JSON included. Read-only.
 */
export async function countInDatabase(needle: string): Promise<number> {
  return withClient(async (client) => {
    await client.query('set default_transaction_read_only = on')
    const { rows: tables } = await client.query<{ name: string }>(
      `select quote_ident(table_name) as name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'`,
    )
    let count = 0
    for (const { name } of tables) {
      const { rows } = await client.query<{ n: number }>(
        `select count(*)::int as n from public.${name} as r where strpos(r::text, $1) > 0`,
        [needle],
      )
      count += rows[0].n
    }
    return count
  })
}

/** Moves job `jobID`'s `createdAt` back by `days`. Fails unless the job exists. */
export async function ageJob(jobID: number, days: number): Promise<void> {
  const { rowCount } = await withClient((client) =>
    client.query(`update payload_jobs set created_at = created_at - make_interval(days => $2) where id = $1`, [
      jobID,
      days,
    ]),
  )
  if (!rowCount) throw new Error(`ageJob: there is no job ${jobID}.`)
}
