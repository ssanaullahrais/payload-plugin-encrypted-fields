# Payload Plugin - Encrypted Global Fields

This is a field type for Payload CMS. It lets you store secrets safely, like API keys or passwords.

## What it does

Once you save a value in this field, it gets encrypted and saved in the database. After that, the real value is never shown again. Not in the REST API. Not in GraphQL. Not in the Local API. Not even in the admin panel for a logged in admin.

Instead, you will only ever see a hidden placeholder like this: `••••••••••••`

If you need the real value in your own code (for example, to call a third party API), you can read it using a special function called `getEncryptedValue()`. This only works on your server, never in the browser.

This plugin needs the Postgres adapter (`@payloadcms/db-postgres`) to work.

## When should you use this

Use this plugin any time your Payload admin panel needs to store a secret. Some common examples are:

- API keys for services like Cloudflare, Stripe, or OpenAI
- Email or SMTP passwords
- Access tokens for a third party service
- Any private credential that only your server should ever use

If a normal text field would work fine but you do not want anyone (even an admin) to be able to open the document and read the secret in plain text, this plugin is for that.

## How this helps you

Normally, if you add a plain text field for a secret in Payload, anyone with admin access can open the document and read the real value. It also shows up in plain text in API responses.

This plugin solves that problem for you automatically. You do not need to write your own encryption code, your own masking logic, or your own database queries. You just add the field, and everything else is handled for you.

This also means less risk of a mistake. You do not have to remember to hide the field, filter it out of an API response, or clean it up somewhere. It is safe by default, everywhere, all the time.

## How this keeps your data secure

- **The real value is encrypted before it is saved.** Nothing is ever stored in plain text in the database.
- **The real value is never sent back out**, not through REST, not through GraphQL, not through the Local API, and not through the admin panel's own network requests. Even a logged in admin only ever sees a masked placeholder like `••••••••••••` once a value is saved.
- **Only your own server code can unlock the real value**, using the `getEncryptedValue()` function. This function is not something a browser or a website visitor can ever call. It only works inside your own backend code.
- **The encryption key comes from your `PAYLOAD_SECRET`**, which is a private value that only lives on your server, not in your code or in the database.
- **Editing is safe too.** If someone opens a document and saves it without touching the secret field, the plugin is smart enough to keep the original encrypted value safe, instead of accidentally overwriting it with the masked placeholder text.

## How to install it

The easiest way is to add it as a plugin inside your `payload.config.ts` file. It works just like `@payloadcms/plugin-seo`.

```ts
import { encryptedFieldsPlugin } from "payload-plugin-encrypted-fields"

export default buildConfig({
  plugins: [
    encryptedFieldsPlugin({
      globals: {
        settings: {
          tab: "API",
          insertAfter: "someExistingFieldName",
          fields: [
            { name: "cloudflareAccountId", label: "Cloudflare Account ID" },
            { name: "cloudflareApiToken", label: "Cloudflare API Token" },
          ],
        },
      },
    }),
  ],
})
```

A few simple notes:

- The `tab` must already exist in your config. This plugin only adds fields into a tab you already made, it does not create a new tab for you.
- If you do not set `tab`, the fields are just added at the top level instead.
- `insertAfter` and `insertBefore` let you choose where the new fields appear, next to a field you already have. If you skip both, the fields are just added at the end.

## Adding the field yourself

Sometimes you want more control over exactly where the field goes. In that case, you can use the `encryptedField()` function directly instead of the plugin.

```ts
import { encryptedField } from "payload-plugin-encrypted-fields"

export const Settings: GlobalConfig = {
  fields: [
    encryptedField("cloudflareApiToken", {
      label: "Cloudflare API Token",
      admin: { description: "..." },
    }),
  ],
}
```

## Reading the real value

This should only ever happen on your server, never on the client.

```ts
import { getEncryptedValue } from "payload-plugin-encrypted-fields"

const apiToken = await getEncryptedValue(req.payload, {
  table: "settings",
  column: "cloudflare_api_token",
})
```

Please be careful with this value. Never send it back out through an API response or anything a browser can read. Only use it inside your own server code, like a background job or a direct call to a third party API.

## Why this plugin does things a certain way

You might think the field could just check "if the value looks like the mask, keep the old value." But this does not actually work safely.

Here is why. When you update a document, Payload first reads the current version of that document. This step already turns the real value into the mask. Only after that does Payload run the save step. So by the time the save step happens, the "old value" it sees is already the mask, not the real secret.

If the plugin trusted that old value, it would accidentally save the mask as the real secret and destroy the real value.

To avoid this problem, the plugin reads the real encrypted value straight from the database at save time, whenever it sees the mask come back. This keeps your real secret safe.

## Settings you can use

You can pass these options into `encryptedField(name, options)`:

| Option | Default value | What it does |
|---|---|---|
| `label` | none | The label shown for the field |
| `admin.description` | a general note | Helper text shown in the admin panel |
| `admin.condition` | none | A normal Payload field condition |
| `access.read` | any logged in user | Controls who is allowed to even see the mask |
| `column` | field name in snake_case | Lets you rename the database column |
| `getSecret` | reads `process.env.PAYLOAD_SECRET` | Where the encryption key comes from |
| `mask` | `••••••••••••` | The placeholder text shown after a value is saved |

## Current status

This plugin was first built for a real project, to safely store Cloudflare Workers AI credentials in Settings > API. It was built as its own separate package so it can be reused again later, without copying the same code every time. It has not been published to npm yet, so please check with the author before assuming it can be installed outside this project.
