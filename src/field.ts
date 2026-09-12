import type { Condition, FieldAccess, TextField } from "payload"

import { decryptValue, encryptValue, looksLikeEncryptedValue } from "./crypto.js"
import { DEFAULT_SECRET_MASK } from "./mask.js"
import { camelToSnakeCase, readRawColumn, writeRawColumn } from "./table.js"

export interface EncryptedFieldOptions {
  label?: string
  admin?: {
    description?: string
    condition?: Condition
    /** Disables editing in the Payload admin UI while preserving API/server writes. */
    disabled?: boolean
    /** Disables editing in the Payload admin UI while preserving API/server writes. */
    readOnly?: boolean
    /** Normal Payload admin field width, e.g. "50%" inside a row. */
    width?: string
  }
  /**
   * Placeholder returned by reads once a value is saved. Defaults to dots.
   * Use this for API-friendly messages like "Cloudflare API Token available".
   */
  apiPlaceholder?: string
  /**
   * Defaults to any logged-in user (`Boolean(req.user)`) — or, when `hidden`
   * is `true`, to `() => false`. This only gates who can see the masked
   * placeholder — the real value never comes back through this field
   * regardless of access.
   */
  access?: {
    read?: FieldAccess
  }
  /**
   * Remove the field from the admin UI and from every read path (REST,
   * GraphQL, Local API) entirely — not even the mask comes back. Use this
   * for secrets nobody should browse to, ever; pair it with an
   * `endpoint` (see `EncryptedFieldSpec` on `encryptedFieldsPlugin`) or
   * `getEncryptedValue()` for the one deliberate way to read the real value
   * back out server-side.
   *
   * Defaults `access.read` to `() => false` (override it if you need some
   * other narrow read rule instead of full hiding).
   */
  hidden?: boolean
  /**
   * DB column name override — defaults to the snake_case of the field name.
   *
   * Required (don't rely on the default) when this field is nested inside a
   * `group`, `row`, `tabs`, or `array` — Payload prefixes the underlying SQL
   * column with the parent path (e.g. a field named `apiKey` inside a group
   * named `emailDelivery` becomes column `email_delivery_api_key`), but this
   * option only ever sees the field's own name, not its ancestors, so it
   * can't derive that prefix for you.
   */
  column?: string
  /** Returns the server-only encryption key. Defaults to `process.env.PAYLOAD_SECRET`. */
  getSecret?: () => string
  /**
   * Alias for `apiPlaceholder`, kept for compatibility.
   */
  mask?: string
  /**
   * When a project adds this plugin to an existing plaintext field, reads
   * are masked immediately. With this enabled, the plugin also encrypts that
   * old plaintext in place after reading it. Defaults to `true`.
   */
  encryptPlaintextOnRead?: boolean
}

function defaultGetSecret(): string {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error("payload-plugin-encrypted-fields: PAYLOAD_SECRET (or a custom getSecret()) must be set to encrypt/decrypt this field.")
  }
  return secret
}

/**
 * A `text` field for secrets (API tokens, credentials) that's encrypted at
 * rest in the database and — critically — never decrypted back out through any
 * Payload read path: REST, GraphQL, the Local API, or the admin UI's own
 * network responses, even for an authenticated admin. Reads always return
 * either nothing or the `mask` placeholder, so the real value never appears
 * anywhere a client (including the admin panel's own "API" debug view) can
 * see it.
 *
 * Code that genuinely needs the real value (your own server-side
 * integration code — the thing that actually calls the third-party API)
 * reads it via `getEncryptedValue()` from this same package, which bypasses
 * this field (and Payload's access control) on purpose. That's the one
 * deliberate, narrow exception — not a general-purpose read path.
 *
 * Supports Payload's Postgres adapter and SQLite adapter.
 */
export function encryptedField(name: string, options: EncryptedFieldOptions = {}): TextField {
  const mask = options.apiPlaceholder ?? options.mask ?? DEFAULT_SECRET_MASK
  const getSecret = options.getSecret ?? defaultGetSecret
  const column = options.column ?? camelToSnakeCase(name)
  const encryptPlaintextOnRead = options.encryptPlaintextOnRead ?? true

  return {
    name,
    type: "text",
    label: options.label,
    admin: {
      description: options.admin?.description ?? "Stored encrypted at rest — never returned in plaintext, even to admins.",
      condition: options.admin?.condition,
      disabled: options.admin?.disabled,
      readOnly: options.admin?.readOnly ?? options.admin?.disabled,
      width: options.admin?.width,
      hidden: options.hidden,
      // Masked <input type="password">-style field rather than Payload's
      // default plain-text rendering — see src/client.tsx.
      components: {
        Field: "payload-plugin-encrypted-fields/client#EncryptedFieldInput",
      },
    },
    access: {
      read: options.access?.read ?? (options.hidden ? () => false : ({ req }) => Boolean(req.user)),
    },
    hooks: {
      afterRead: [
        async ({ value, req, collection, global, data }) => {
          if (typeof value !== "string" || value.length === 0) return value

          const secret = getSecret()
          if (decryptValue(value, secret) !== null) return mask
          if (!encryptPlaintextOnRead) return mask

          const owner = global ?? collection
          const table = typeof owner?.dbName === "string" ? owner.dbName : owner?.slug
          if (!table) return mask

          const id = (data as { id?: string | number } | undefined)?.id
          await writeRawColumn(req.payload, table, column, encryptValue(value, secret), id)
          return mask
        },
      ],
      beforeChange: [
        async ({ value, req, collection, global, originalDoc }) => {
          // Untouched in the admin form (still showing the mask) — keep
          // whatever ciphertext is already stored, don't touch it. Read it
          // straight from the DB rather than trusting this hook's own
          // `previousValue`: on an update, Payload re-reads the current
          // document (running `afterRead` first, which turns this field
          // into the mask) before running `beforeChange` on the incoming
          // payload — so `previousValue` here is already the masked
          // placeholder, not the raw ciphertext. Re-encrypting *that* would
          // silently overwrite the real secret with an encrypted copy of
          // the mask string.
          if (value === mask) {
            // A collection/global can override its actual SQL table name via
            // `dbName` (string form only — the function form isn't resolvable
            // here without the arguments Payload's own schema builder has).
            // Fall back to the slug, which is what Payload uses when `dbName`
            // isn't set.
            const owner = global ?? collection
            const table = typeof owner?.dbName === "string" ? owner.dbName : owner?.slug
            if (!table) return value
            const id = (originalDoc as { id?: string | number } | undefined)?.id
            const raw = await readRawColumn(req.payload, table, column, id)
            if (typeof raw === "string" && raw.length > 0 && !looksLikeEncryptedValue(raw)) {
              return encryptValue(raw, getSecret())
            }
            return raw
          }
          if (typeof value !== "string" || !value) return value
          return encryptValue(value, getSecret())
        },
      ],
    },
  }
}
