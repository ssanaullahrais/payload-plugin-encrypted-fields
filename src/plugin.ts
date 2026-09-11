import type { Config, Field } from "payload"

import { encryptedField, type EncryptedFieldOptions } from "./field"

export interface EncryptedFieldSpec extends EncryptedFieldOptions {
  name: string
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

export interface EncryptedFieldsPluginOptions {
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

function applyTarget(fields: Field[], target: EncryptedFieldsTarget, ownerSlug: string): Field[] {
  const newFields = target.fields.map(({ name, ...options }) => encryptedField(name, options))

  if (!target.tab) return insertFields(fields, newFields, target)

  const tabsField = fields.find((field): field is Extract<Field, { type: "tabs" }> => field.type === "tabs")
  const tab = tabsField?.tabs.find((candidate) => "label" in candidate && candidate.label === target.tab)
  if (!tabsField || !tab) {
    throw new Error(
      `payload-plugin-encrypted-fields: tab "${target.tab}" not found on "${ownerSlug}" — create it in your own config first (this plugin injects into an existing tab, it doesn't create one).`
    )
  }
  tab.fields = insertFields(tab.fields, newFields, target)
  return fields
}

/**
 * A real Payload plugin — drop it into `plugins: []` in `payload.config.ts`
 * the same way you would `@payloadcms/plugin-seo` or any other official
 * plugin, instead of hand-wiring `encryptedField()` calls into each
 * collection/global's `fields` array yourself.
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
 *         { name: "cloudflareApiToken", label: "Cloudflare API Token" },
 *       ],
 *     },
 *   },
 * })
 * ```
 */
export function encryptedFieldsPlugin(options: EncryptedFieldsPluginOptions) {
  return (config: Config): Config => {
    if (options.collections) {
      config.collections = (config.collections ?? []).map((collection) => {
        const target = options.collections?.[collection.slug]
        if (!target) return collection
        return { ...collection, fields: applyTarget(collection.fields, target, collection.slug) }
      })
    }

    if (options.globals) {
      config.globals = (config.globals ?? []).map((global) => {
        const target = options.globals?.[global.slug]
        if (!target) return global
        return { ...global, fields: applyTarget(global.fields, target, global.slug) }
      })
    }

    return config
  }
}
