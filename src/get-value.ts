import type { Payload } from "payload"

import { decryptValue } from "./crypto"
import { readRawColumn } from "./table"

export interface GetEncryptedValueOptions {
  /** The collection or global's slug (its Postgres table name). */
  table: string
  /** DB column name — see `encryptedField`'s `column` option for the default naming. */
  column: string
  /** Omit for a Global (always a single row); required for a Collection document. */
  id?: string | number
  /** Must match the `getSecret` passed to `encryptedField` for this same value. Defaults to `process.env.PAYLOAD_SECRET`. */
  getSecret?: () => string
}

/**
 * Reads and decrypts a real secret value directly from Postgres, bypassing
 * Payload's field hooks and access control entirely (`encryptedField()`'s
 * `afterRead` always returns a masked placeholder, on purpose — the real
 * value never comes back through any normal Payload read path). This is
 * the one deliberate exception: your own server-side integration code
 * (the thing that actually calls the third-party API) needs the real value
 * to do that.
 *
 * Never expose this function's return value through any API response.
 */
export async function getEncryptedValue(payload: Payload, options: GetEncryptedValueOptions): Promise<string | null> {
  const getSecret =
    options.getSecret ??
    (() => {
      const secret = process.env.PAYLOAD_SECRET
      if (!secret) {
        throw new Error("payload-plugin-encrypted-fields: PAYLOAD_SECRET (or a custom getSecret()) must be set to decrypt this value.")
      }
      return secret
    })

  const raw = await readRawColumn(payload, options.table, options.column, options.id)
  return raw ? decryptValue(raw, getSecret()) : null
}
