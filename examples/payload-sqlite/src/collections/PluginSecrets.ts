import type { CollectionConfig } from 'payload'

export const PluginSecrets: CollectionConfig = {
  slug: 'plugin-secrets',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    read: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
