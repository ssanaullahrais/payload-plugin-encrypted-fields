import type { CollectionConfig, Config, Endpoint, Field, GlobalConfig } from "payload"
import { definePlugin } from "payload"

import { camelToSnakeCase } from "./table.js"
import { createEncryptedFieldEndpoint, type EncryptedFieldEndpointOptions } from "./endpoint.js"
import { encryptedField, type EncryptedFieldOptions } from "./field.js"

export interface EncryptedFieldSpec extends EncryptedFieldOptions {
  name: string
  /**
   * Also expose this field's real, decrypted value through a custom Payload
   * endpoint (see https://payloadcms.com/docs/rest-api/overview#custom-endpoints),
   * mounted at `/api/{slug}/{id}/encrypted/{name}` for a collection or
   * `/api/globals/{slug}/encrypted/{name}` for a global.
   *
   * Omit this entirely if `getEncryptedValue()` from your own server code
   * (Local API context) is enough — this option only matters when something
   * outside that process (a separate internal service, an authenticated
   * internal tool) needs the real value over HTTP instead.
   */
  endpoint?: Pick<EncryptedFieldEndpointOptions, "access" | "path" | "getSecret">
}

export interface EncryptedFieldsTarget {
  /** Field(s) to inject. */
  fields: EncryptedFieldSpec[]
  /**
   * Inject into an existing tab's own `fields` array, matched by label. The
   * tab must already exist in your collection/global config (a top-level
   * `{ type: "tabs", tabs: [...] }` field) — this plugin only injects into
   * it, it doesn't create one. Omit to append at the top level instead.
   */
  tab?: string
  /** Insert right after this existing field's `name`, instead of at the end. */
  insertAfter?: string
  /** Insert right before this existing field's `name`, instead of at the end. */
  insertBefore?: string
}

export interface EncryptedFieldsPluginOptions extends Record<string, unknown> {
  /** Keyed by collection slug. */
  collections?: Record<string, EncryptedFieldsTarget>
  /** Keyed by global slug. */
  globals?: Record<string, EncryptedFieldsTarget>
}

function insertFields(existing: Field[], newFields: Field[], target: EncryptedFieldsTarget): Field[] {
  const anchorName = target.insertAfter ?? target.insertBefore
  if (!anchorName) return [...existing, ...newFields]

  const index = existing.findIndex((field) => "name" in field && field.name === anchorName)
  if (index === -1) return [...existing, ...newFields] // anchor not found — fall back to appending

  const insertAt = target.insertAfter ? index + 1 : index
  return [...existing.slice(0, insertAt), ...newFields, ...existing.slice(insertAt)]
}

function applyFields(fields: Field[], target: EncryptedFieldsTarget, ownerSlug: string): Field[] {
  const newFields = target.fields.map(({ name, endpoint: _endpoint, ...options }) => encryptedField(name, options))

  if (!target.tab) return insertFields(fields, newFields, target)

  let didInsert = false
  const nextFields = fields.map((field) => {
    if (field.type !== "tabs") return field

    const tabIndex = field.tabs.findIndex((candidate) => "label" in candidate && candidate.label === target.tab)
    if (tabIndex === -1) return field

    didInsert = true
    return {
      ...field,
      tabs: field.tabs.map((tab, index) => (index === tabIndex ? { ...tab, fields: insertFields(tab.fields, newFields, target) } : tab)),
    }
  })

  if (!didInsert) {
    throw new Error(
      `payload-plugin-encrypted-fields: tab "${target.tab}" not found on "${ownerSlug}" — create it in your own config first (this plugin injects into an existing tab, it doesn't create one).`
    )
  }
  return nextFields
}

/**
 * Builds the `Endpoint[]` (see https://payloadcms.com/docs/rest-api/overview#custom-endpoints)
 * for every field on this target that opted into `endpoint`. `table` is the
 * owning collection/global's real SQL table name — a `dbName` override if
 * one is set (string form only, matching the same limitation documented on
 * `encryptedField()`'s `column` option), otherwise its slug.
 */
function buildEndpoints(target: EncryptedFieldsTarget, table: string, isCollection: boolean): Endpoint[] {
  const endpoints: Endpoint[] = []
  for (const spec of target.fields) {
    if (!spec.endpoint) continue
    const column = spec.column ?? camelToSnakeCase(spec.name)
    endpoints.push(
      createEncryptedFieldEndpoint(spec.name, {
        ...spec.endpoint,
        column,
        table,
        isCollection,
      })
    )
  }
  return endpoints
}

/**
 * A real Payload plugin — drop it into `plugins: []` in `payload.config.ts`
 * the same way you would `@payloadcms/plugin-seo` or any other official
 * plugin, instead of hand-wiring `encryptedField()` calls into each
 * collection/global's `fields` array yourself.
 *
 * Follows the same "spread the existing config, don't replace it" shape
 * Payload's own "Building Your Own Plugin" guide recommends
 * (https://payloadcms.com/docs/plugins/build-your-own) — every collection,
 * global, and its `fields`/`endpoints` arrays are spread before this
 * plugin's additions, so nothing you already configured is lost.
 *
 * @example
 * ```ts
 * encryptedFieldsPlugin({
 *   globals: {
 *     settings: {
 *       tab: "API",
 *       insertAfter: "aiRenameFile",
 *       fields: [
 *         { name: "cloudflareAccountId", label: "Cloudflare Account ID" },
 *         {
 *           name: "cloudflareApiToken",
 *           label: "Cloudflare API Token",
 *           // Hide it from the admin UI and every normal read path, and
 *           // only allow it back out through this one narrow endpoint.
 *           hidden: true,
 *           endpoint: {
 *             access: ({ user }) => Boolean(user),
 *           },
 *         },
 *       ],
 *     },
 *   },
 * })
 * ```
 */
export const encryptedFieldsPlugin = definePlugin<EncryptedFieldsPluginOptions>({
  slug: "payload-plugin-encrypted-fields",
  plugin: ({ collections, config: incomingConfig, globals }) => {
    const options: EncryptedFieldsPluginOptions = { collections, globals }
    const config: Config = { ...incomingConfig }

    if (options.collections) {
      config.collections = (incomingConfig.collections ?? []).map((collection) => {
        const target = options.collections?.[collection.slug]
        if (!target) return collection

        const table = typeof (collection as CollectionConfig).dbName === "string" ? (collection as CollectionConfig).dbName : collection.slug

        return {
          ...collection,
          fields: applyFields(collection.fields, target, collection.slug),
          endpoints: [...(collection.endpoints || []), ...buildEndpoints(target, table as string, true)],
        }
      })
    }

    if (options.globals) {
      config.globals = (incomingConfig.globals ?? []).map((global) => {
        const target = options.globals?.[global.slug]
        if (!target) return global

        const table = typeof (global as GlobalConfig).dbName === "string" ? (global as GlobalConfig).dbName : global.slug

        return {
          ...global,
          fields: applyFields(global.fields, target, global.slug),
          endpoints: [...(global.endpoints || []), ...buildEndpoints(target, table as string, false)],
        }
      })
    }

    return config
  },
})
