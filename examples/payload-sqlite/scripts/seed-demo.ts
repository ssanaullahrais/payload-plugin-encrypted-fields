import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const ADMIN_EMAIL = 'admin@admin.com'
const ADMIN_PASSWORD = 'password'
const DEMO_COLLECTION_NAME = 'Real Scenario Secrets'

const payload = await getPayload({ config })

const users = await payload.find({
  collection: 'users',
  limit: 1,
  where: {
    email: {
      equals: ADMIN_EMAIL,
    },
  },
})

if (users.docs[0]) {
  await payload.update({
    collection: 'users',
    id: users.docs[0].id,
    data: {
      password: ADMIN_PASSWORD,
    },
  })
} else {
  await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  })
}

const secrets = await payload.find({
  collection: 'plugin-secrets',
  limit: 1,
  where: {
    name: {
      equals: DEMO_COLLECTION_NAME,
    },
  },
})

const collectionData = {
  defaultSecret: 'default-secret-123456',
  hiddenToken: 'hidden-secret-123456',
  name: DEMO_COLLECTION_NAME,
  smtpPassword: 'smtp-password-123456',
  visibleToken: 'cloudflare-token-123456',
  webhookSigningSecret: 'webhook-secret-123456',
}

if (secrets.docs[0]) {
  await payload.update({
    collection: 'plugin-secrets',
    id: secrets.docs[0].id,
    data: collectionData,
  })
} else {
  await payload.create({
    collection: 'plugin-secrets',
    data: collectionData,
  })
}

await payload.updateGlobal({
  slug: 'plugin-settings',
  data: {
    globalCloudflareToken: 'global-cloudflare-token-123456',
    globalDefaultSecret: 'global-default-secret-123456',
    globalHiddenToken: 'global-hidden-secret-123456',
    globalSmtpPassword: 'global-smtp-password-123456',
    globalVisibleToken: 'global-api-token-123456',
    name: 'Real Scenario Global Settings',
  },
})

console.log(`Demo ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
