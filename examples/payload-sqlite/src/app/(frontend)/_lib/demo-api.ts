import { headers as getHeaders } from 'next/headers.js'

async function readJSON(url: string) {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    return { status: response.status, error: await response.text() }
  }
  return response.json()
}

export async function getDemoApiData() {
  const headers = await getHeaders()
  const host = headers.get('host')
  const protocol = host?.startsWith('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`

  const latest = await readJSON(`${base}/api/plugin-secrets?limit=1&sort=-createdAt`)
  const doc = latest.docs?.[0]

  return {
    collectionEndpoint: doc?.id
      ? await readJSON(`${base}/api/plugin-secrets/${doc.id}/encrypted/hiddenToken`)
      : null,
    collectionRead: doc?.id ? await readJSON(`${base}/api/plugin-secrets/${doc.id}`) : null,
    globalEndpoint: await readJSON(`${base}/api/globals/plugin-settings/encrypted/globalHiddenToken`),
    globalRead: await readJSON(`${base}/api/globals/plugin-settings`),
  }
}
