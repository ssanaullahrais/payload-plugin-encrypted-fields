import type { Payload } from "payload"

/** Minimal shape of the `pg.Pool` exposed by `@payloadcms/db-postgres` as `payload.db.pool`. */
interface QueryablePool {
  query: <T extends Record<string, unknown>>(
    query: string | { text: string; values?: unknown[] }
  ) => Promise<{ rows: T[] }>
}

export function camelToSnakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Reads a single column straight from Postgres, bypassing Payload's access
 * control and field hooks entirely. Requires the Postgres adapter
 * (`@payloadcms/db-postgres`) — `payload.db.pool` is where it exposes the
 * underlying `pg.Pool`.
 *
 * Pass `id` for a collection document; omit it for a Global, which is
 * always a single row.
 */
export async function readRawColumn(
  payload: Payload,
  table: string,
  column: string,
  id?: string | number
): Promise<string | null> {
  const pool = (payload.db as unknown as { pool?: QueryablePool }).pool
  if (!pool) {
    throw new Error(
      "payload-plugin-encrypted-fields: readRawColumn() requires the Postgres adapter (@payloadcms/db-postgres) — payload.db.pool was not found."
    )
  }

  const query =
    id === undefined
      ? `SELECT "${column}" FROM "${table}" LIMIT 1`
      : { text: `SELECT "${column}" FROM "${table}" WHERE id = $1 LIMIT 1`, values: [id] }

  const result = await pool.query<Record<string, string | null>>(query)
  return result.rows[0]?.[column] ?? null
}
