import type { Payload } from "payload"

/** Minimal shape of the `pg.Pool` exposed by `@payloadcms/db-postgres` as `payload.db.pool`. */
interface QueryablePool {
  query: <T extends Record<string, unknown>>(
    query: string | { text: string; values?: unknown[] }
  ) => Promise<{ rows: T[] }>
}

/** Minimal shape of the libSQL client exposed by `@payloadcms/db-sqlite` as `payload.db.client`. */
interface QueryableSQLiteClient {
  execute: (
    query: string | { args?: unknown[]; sql: string }
  ) => Promise<{ rows: Array<Record<string, unknown>> }>
}

export function camelToSnakeCase(name: string): string {
  return name
    .replace(/-/g, "_")
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function assertIdentifier(identifier: string, kind: "column" | "table"): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(
      `payload-plugin-encrypted-fields: Invalid ${kind} identifier "${identifier}". Use a plain database identifier or pass a safe column/table name.`
    )
  }
}

/**
 * Reads a single column straight from the database, bypassing Payload's
 * access control and field hooks entirely. Supports Payload's Postgres
 * adapter (`payload.db.pool`) and SQLite adapter (`payload.db.client`).
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
  assertIdentifier(table, "table")
  assertIdentifier(column, "column")

  const db = payload.db as unknown as {
    client?: QueryableSQLiteClient
    pool?: QueryablePool
  }

  if (db.pool) {
    const query =
      id === undefined
        ? `SELECT "${column}" FROM "${table}" LIMIT 1`
        : { text: `SELECT "${column}" FROM "${table}" WHERE id = $1 LIMIT 1`, values: [id] }

    const result = await db.pool.query<Record<string, string | null>>(query)
    return result.rows[0]?.[column] ?? null
  }

  if (db.client) {
    const query =
      id === undefined
        ? { sql: `SELECT "${column}" FROM "${table}" LIMIT 1` }
        : { sql: `SELECT "${column}" FROM "${table}" WHERE id = ? LIMIT 1`, args: [id] }

    const result = await db.client.execute(query)
    const value = result.rows[0]?.[column]
    return typeof value === "string" ? value : value == null ? null : String(value)
  }

  throw new Error(
    "payload-plugin-encrypted-fields: readRawColumn() requires a supported Payload database adapter. Expected payload.db.pool (Postgres) or payload.db.client (SQLite)."
  )
}
