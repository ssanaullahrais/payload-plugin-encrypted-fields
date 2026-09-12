import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { encryptedFieldsPlugin } from 'payload-plugin-encrypted-fields'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { PluginSecrets } from './collections/PluginSecrets'
import { PluginSettings } from './globals/PluginSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const demoDatabaseURL = process.env.DATABASE_URL || 'file:./temp-payload-encrypted-fields-sqlite.db'
const demoPayloadSecret =
  process.env.PAYLOAD_SECRET || 'payload-plugin-encrypted-fields-demo-secret'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, PluginSecrets],
  globals: [PluginSettings],
  editor: lexicalEditor(),
  secret: demoPayloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: demoDatabaseURL,
    },
  }),
  sharp,
  plugins: [
    encryptedFieldsPlugin({
      collections: {
        'plugin-secrets': {
          insertAfter: 'name',
          fields: [
            {
              name: 'defaultSecret',
              label: 'Default Encrypted Secret',
              access: {
                read: () => true,
              },
            },
            {
              name: 'visibleToken',
              label: 'Cloudflare API Token',
              apiPlaceholder: 'Cloudflare API Token available',
              admin: {
                readOnly: true,
                description: 'Existing saved token is locked in the admin UI for this demo.',
              },
              access: {
                read: () => true,
              },
            },
            {
              name: 'smtpPassword',
              label: 'SMTP Password',
              apiPlaceholder: 'SMTP Password available',
              access: {
                read: () => true,
              },
            },
            {
              name: 'webhookSigningSecret',
              label: 'Webhook Signing Secret',
              apiPlaceholder: 'Webhook signing secret configured',
              admin: {
                disabled: true,
                description: 'Disabled uses the same protected input, but cannot be edited in admin.',
              },
              access: {
                read: () => true,
              },
            },
            {
              name: 'hiddenToken',
              label: 'Hidden Token',
              hidden: true,
              endpoint: {
                access: () => true,
              },
            },
          ],
        },
      },
      globals: {
        'plugin-settings': {
          insertAfter: 'name',
          fields: [
            {
              name: 'globalDefaultSecret',
              label: 'Global Default Secret',
              access: {
                read: () => true,
              },
            },
            {
              name: 'globalVisibleToken',
              label: 'Global API Token',
              apiPlaceholder: 'Global API Token available',
              admin: {
                readOnly: true,
                description: 'Read-only applies to this current field, not a separate demo field.',
              },
              access: {
                read: () => true,
              },
            },
            {
              name: 'globalSmtpPassword',
              label: 'Global SMTP Password',
              apiPlaceholder: 'Global SMTP Password available',
              access: {
                read: () => true,
              },
            },
            {
              name: 'globalCloudflareToken',
              label: 'Global Cloudflare Token',
              apiPlaceholder: 'Global Cloudflare Token available',
              access: {
                read: () => true,
              },
            },
            {
              name: 'globalHiddenToken',
              label: 'Global Hidden Token',
              hidden: true,
              endpoint: {
                access: () => true,
              },
            },
          ],
        },
      },
    }),
  ],
})
