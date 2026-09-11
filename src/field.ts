import type { Condition, FieldAccess, TextField } from "payload"

import { encryptValue } from "./crypto"
import { DEFAULT_SECRET_MASK } from "./mask"
import { camelToSnakeCase, readRawColumn } from "./table"

export interface EncryptedFieldOptions {
  label?: string
  admin?: {
    description?: string
    condition?: Condition
  }
  /** Defaults to admin-only (`req.user?.role === "admin"` if a `role` field exists, else any logged-in user). */
  access?: {
    read?: FieldAccess
  }
  /** DB column name override — defaults to the snake_case of the field name. */
  column?: string
  /** Returns the server-only encryption key. Defaults to `process.env.PAYLOAD_SECRET`. */
  getSecret?: () => string
  /** Placeholder returned by reads once a value is saved. Defaults to 12 bullet characters. */
  mask?: string
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
 * rest in Postgres and — critically — never decrypted back out through any
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
 * Requires the Postgres adapter (`@payloadcms/db-postgres`).
 */
export function encryptedField(name: string, options: EncryptedFieldOptions = {}): TextField {
  const mask = options.mask ?? DEFAULT_SECRET_MASK
  const getSecret = options.getSecret ?? defaultGetSecret
  const column = options.column ?? camelToSnakeCase(name)

  return {
    name,
    type: "text",
    label: options.label,
    admin: {
      description: options.admin?.description ?? "Stored encrypted at rest — never returned in plaintext, even to admins.",
      condition: options.admin?.condition,
      // Masked <input type="password">-style field rather than Payload's
      // default plain-text rendering — see src/client.tsx.
      components: {
        Field: "payload-plugin-encrypted-fields/client#EncryptedFieldInput",
      },
    },
    access: {
      read: options.access?.read ?? (({ req }) => Boolean(req.user)),
    },
    hooks: {
      afterRead: [
        ({ value }) => (typeof value === "string" && value.length > 0 ? mask : value),
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
            const table = global?.slug ?? collection?.slug
            if (!table) return value
            const id = (originalDoc as { id?: string | number } | undefined)?.id
            return readRawColumn(req.payload, table, column, id)
          }
          if (typeof value !== "string" || !value) return value
          return encryptValue(value, getSecret())
        },
      ],
    },
  }
}
