import { ApiResponsePanel } from '../_components/ApiResponsePanel'
import { getDemoApiData } from '../_lib/demo-api'

export const dynamic = 'force-dynamic'

export default async function PluginTestPage() {
  const demo = await getDemoApiData()

  return (
    <main className="demo-shell">
      <section className="hero rest-hero">
        <div>
          <p className="eyebrow">REST API proof</p>
          <h1>See exactly what the API returns.</h1>
          <p className="lead">
            This page is intentionally simple: normal API responses prove that secrets are hidden, and protected endpoint responses prove that trusted code can still retrieve the real value.
          </p>
          <div className="actions">
            <a href="/">Back to demo</a>
            <a href="/admin">Open admin</a>
          </div>
        </div>
        <aside className="login-card" aria-label="What to check">
          <span>Look for</span>
          <strong>No plaintext in normal API</strong>
          <code>hidden-secret-123456 only appears in protected endpoint output</code>
        </aside>
      </section>

      <section className="compare-grid" aria-label="REST result summary">
        <div>
          <span>Normal REST read</span>
          <strong>defaultSecret is dots</strong>
          <strong>Cloudflare token is a safe message</strong>
          <strong>hiddenToken is omitted</strong>
        </div>
        <div>
          <span>Protected endpoint read</span>
          <strong>Only the selected hidden field is returned</strong>
          <strong>Use this only with a narrow access rule</strong>
          <strong>Demo value: hidden-secret-123456</strong>
        </div>
      </section>

      <section className="api-grid" aria-label="Live REST responses">
        <ApiResponsePanel
          eyebrow="Collection REST"
          title="Normal read"
          value={demo.collectionRead}
        />
        <ApiResponsePanel
          eyebrow="Collection endpoint"
          title="Protected plaintext read"
          value={demo.collectionEndpoint}
        />
        <ApiResponsePanel
          eyebrow="Global REST"
          title="Normal global read"
          value={demo.globalRead}
        />
        <ApiResponsePanel
          eyebrow="Global endpoint"
          title="Protected global plaintext read"
          value={demo.globalEndpoint}
        />
      </section>
    </main>
  )
}
