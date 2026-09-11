# payload-plugin-encrypted-fields

A Payload CMS field type for storing third-party API credentials (tokens, keys) **encrypted at rest**, that **never return the real value through any read path** once saved — REST, GraphQL, the Local API, or the admin UI's own network responses, even for an authenticated admin. Reads always return either nothing or a masked placeholder (`••••••••••••`). Only your own server-side integration code can decrypt the real value, via `getEncryptedValue()`.

Requires the Postgres adapter (`@payloadcms/db-postgres`).

## Install (as a plugin — the easy way)

Drop it into `plugins: []` in `payload.config.ts`, the same way you'd add `@payloadcms/plugin-seo`:

```ts
import { encryptedFieldsPlugin } from "payload-plugin-encrypted-fields"

export default buildConfig({
  // ...
  plugins: [
    encryptedFieldsPlugin({
      globals: {
        settings: {
          tab: "API", // inject into an existing tab, matched by label
          insertAfter: "someExistingFieldName", // optional — position control
          fields: [
            { name: "cloudflareAccountId", label: "Cloudflare Account ID" },
            { name: "cloudflareApiToken", label: "Cloudflare API Token" },
          ],
        },
      },
      // collections: { ... } works the same way
    }),
  ],
})
```

- `tab` must already exist in your own collection/global config (a top-level `{ type: "tabs", tabs: [...] }` field) — this plugin injects into it, it doesn't create one.
- Omit `tab` to append the fields at the field array's top level instead.
- `insertAfter` / `insertBefore` place the new fields next to an existing field by name; omit both to append at the end.

## Use as a field directly (more control over placement)

If you need the field interleaved precisely among fields you're already defining by hand (rather than appended by the plugin), use the lower-level `encryptedField()` factory the plugin itself calls:

```ts
import { encryptedField } from "payload-plugin-encrypted-fields"

export const Settings: GlobalConfig = {
  fields: [
    // ...
    encryptedField("cloudflareApiToken", {
      label: "Cloudflare API Token",
      admin: { description: "..." },
    }),
  ],
}
```

## Reading the real value (server-side only)

```ts
import { getEncryptedValue } from "payload-plugin-encrypted-fields"

const apiToken = await getEncryptedValue(req.payload, {
  table: "settings", // the collection/global's slug (its Postgres table name)
  column: "cloudflare_api_token", // snake_case of the field name
})
```

**Never** pass this value back out through an endpoint response, a field resolver, or anything else a client can read. It exists only for your own server code (a background job, a fetch to the third-party API) to use directly.

## Why not just trust Payload's `previousValue` hook argument?

The naive version of this field's `beforeChange` hook would be: "if the incoming value is still the mask, keep `previousValue`." That's wrong. On a document update, Payload re-reads the current document (running `afterRead` — which turns this field into the mask) *before* running `beforeChange` on the incoming payload. So `previousValue` in the hook is already the masked placeholder, not the raw ciphertext. Re-encrypting that silently destroys the real secret on every no-op save.

This field instead reads the current ciphertext straight from Postgres inside the `beforeChange` hook itself when it sees the mask come back, bypassing Payload's own hook-argument plumbing for that one read.

## Options

`encryptedField(name, options)`:

| Option | Default | Description |
|---|---|---|
| `label` | — | Field label |
| `admin.description` | generic notice | Admin UI helper text |
| `admin.condition` | — | Standard Payload field `Condition` |
| `access.read` | any logged-in user | `FieldAccess` — who can even see the mask |
| `column` | snake_case of `name` | DB column override |
| `getSecret` | reads `process.env.PAYLOAD_SECRET` | Encryption key provider |
| `mask` | `••••••••••••` | Placeholder shown once a value is saved |

## Status

Built in-repo for this project's Cloudflare Workers AI integration (Settings > API), structured as a standalone workspace package so it's reusable for future integrations without copy-pasting the encrypt/decrypt/mask pattern. Not yet published to npm — ask before assuming it's installable outside this repo.
