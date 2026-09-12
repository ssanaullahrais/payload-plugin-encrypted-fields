import type { GlobalConfig } from 'payload'

export const PluginSettings: GlobalConfig = {
  slug: 'plugin-settings',
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      defaultValue: 'Plugin Settings',
    },
  ],
}
