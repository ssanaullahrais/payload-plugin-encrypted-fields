import type { Endpoint, PayloadRequest } from "payload"
import { headersWithCors } from "payload"

import { getEncryptedValue } from "./get-value.js"

export interface EncryptedFieldEndpointOptions {
  /**
   * The one required piece — this endpoint hands back the real, decrypted
   * secret, so unlike the field's own `access.read` (which only gates the
   * masked placeholder) there is no permissive default here. You must say
   * explicitly who is allowed to call it.
   *
   * Receives the same `PayloadRequest` a normal Payload access control
   * function or endpoint handler gets — `req.user` is the authenticated
   * user (if any), since custom endpoints are **not** authenticated by
   * default. See https://payloadcms.com/docs/rest-api/overview#custom-endpoints.
   */
  access: (req: PayloadRequest) => boolean | Promise<boolean>
  /**
   * Path segment appended after the collection/global slug, following the
   * same `path` convention as any other Payload custom endpoint (e.g. a
   * `path: "/:id/tracking"` on an `orders` collection is reachable at
   * `/api/orders/:id/tracking`). Defaults to `/:id/encrypted/{fieldName}`
   * for collection endpoints and `/encrypted/{fieldName}` for globals.
   */
  path?: string
  /** DB column name — same as `encryptedField`'s `column` option. */
  column: string
  /** The collection or global's slug (its database table name). */
  table: string
  /** Must match the `getSecret` passed to `encryptedField` for this same value. Defaults to `process.env.PAYLOAD_SECRET`. */
  getSecret?: () => string
  /** Omit for a Global endpoint (always a single row); pass `true` for a Collection endpoint, whose path carries a `:id` route param. */
  isCollection?: boolean
}

/**
 * Builds a Payload custom endpoint (the same `{ path, method, handler }`
 * shape documented at
 * https://payloadcms.com/docs/rest-api/overview#custom-endpoints) that
 * decrypts and returns one `encryptedField()` value on demand.
 *
 * This is the HTTP counterpart to `getEncryptedValue()` — use it when the
 * code that needs the real secret isn't the same server process that reads
 * it (a separate internal service, an authenticated internal tool, etc.)
 * and calling Payload's Local API directly isn't an option. Both bypass the
 * field's own `afterRead` mask and `access.read` on purpose; that's the one
 * deliberate exception documented on `encryptedField()`.
 *
 * Payload does not authenticate custom endpoints for you, so `access` is
 * mandatory here — there is no "any logged-in user" fallback like the
 * field's own read access, because this endpoint's whole job is returning
 * the plaintext.
 */
export function createEncryptedFieldEndpoint(name: string, options: EncryptedFieldEndpointOptions): Endpoint {
  const { access, column, table, isCollection } = options
  const path = options.path ?? (isCollection ? `/:id/encrypted/${name}` : `/encrypted/${name}`)
  const getSecret =
    options.getSecret ??
    (() => {
      const secret = process.env.PAYLOAD_SECRET
      if (!secret) {
        throw new Error("payload-plugin-encrypted-fields: PAYLOAD_SECRET (or a custom getSecret()) must be set to decrypt this value.")
      }
      return secret
    })

  return {
    path,
    method: "get",
    handler: async (req) => {
      const allowed = await access(req)
      if (!allowed) {
        return Response.json({ error: "Forbidden" }, { status: 403, headers: headersWithCors({ headers: new Headers(), req }) })
      }

      // `req.routeParams` carries any `:param` segments matched from the
      // collection's own route (e.g. the `:id` in an entry's own
      // `endpoints` path) — see the `/:id/tracking` example in the docs.
      const id = isCollection ? (req.routeParams?.id as string | number | undefined) : undefined
      if (isCollection && id === undefined) {
        return Response.json({ error: "Missing document id" }, { status: 400, headers: headersWithCors({ headers: new Headers(), req }) })
      }

      const value = await getEncryptedValue(req.payload, { table, column, id, getSecret })
      if (value === null) {
        return Response.json({ error: "No value stored" }, { status: 404, headers: headersWithCors({ headers: new Headers(), req }) })
      }

      return Response.json({ value }, { headers: headersWithCors({ headers: new Headers(), req }) })
    },
  }
}
