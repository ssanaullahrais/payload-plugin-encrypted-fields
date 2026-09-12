import { ApiResponsePanel } from './_components/ApiResponsePanel'
import { getDemoApiData } from './_lib/demo-api'
import './styles.css'

export const dynamic = 'force-dynamic'

const addFieldCode = `fields: [
  {
    name: "cloudflareApiToken",
    label: "Cloudflare API Token",
    apiPlaceholder: "Cloudflare API Token available"
  }
]`

const readOnServerCode = `const token = await getEncryptedValue(req.payload, {
  table: "plugin-secrets",
  column: "hidden_token",
  id: 4,
})`

export default async function HomePage() {
  const demo = await getDemoApiData()

  return (
    <main className="demo-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Payload encrypted fields</p>
          <h1>Secret fields for Payload, without the scary setup.</h1>
          <p className="lead">
            Put API keys and passwords in Payload. Your team can see that a value exists, normal APIs stay safe, and your backend can still use the real secret when it needs to.
          </p>
          <div className="actions">
            <a href="/admin">Open admin</a>
            <a href="/plugin-test">View raw API proof</a>
            <a href="https://github.com/ssanaullahrais/payload-plugin-encrypted-fields">GitHub docs</a>
          </div>
        </div>
        <aside className="login-card" aria-label="Demo login">
          <span>Demo login</span>
          <strong>admin@admin.com</strong>
          <code>password</code>
        </aside>
      </section>

      <section className="simple-steps" aria-label="How the demo works">
        <article>
          <span>1</span>
          <h2>Add a secret field</h2>
          <p>Choose a name, like <code>cloudflareApiToken</code>. The plugin turns it into a safe password-style field.</p>
        </article>
        <article>
          <span>2</span>
          <h2>Paste the value in admin</h2>
          <p>Save a real value like <code>cloudflare-token-123456</code>. It is encrypted before it is stored.</p>
        </article>
        <article>
          <span>3</span>
          <h2>Use it safely</h2>
          <p>Normal API users see only placeholders. Your trusted server can read the real value when it calls Cloudflare, SMTP, or another service.</p>
        </article>
      </section>

      <section className="compare-grid" aria-label="What each reader sees">
        <div>
          <span>What a normal API visitor sees</span>
          <strong>••••••••••••••••••••</strong>
          <strong>Cloudflare API Token available</strong>
          <strong>Hidden fields do not show up</strong>
        </div>
        <div>
          <span>What your trusted backend can use</span>
          <strong>default-secret-123456</strong>
          <strong>cloudflare-token-123456</strong>
          <strong>hidden-secret-123456</strong>
        </div>
      </section>

      <section className="mini-docs" aria-label="Small developer guide">
        <article className="plain-guide">
          <div className="section-heading">
            <span>The whole workflow</span>
            <h2>Use it in four small steps</h2>
          </div>
          <ol>
            <li>Install the plugin package.</li>
            <li>Add one field in your Payload config.</li>
            <li>Paste the real secret in the Payload admin panel.</li>
            <li>Use <code>getEncryptedValue()</code> only in trusted server code.</li>
          </ol>
        </article>
        <article>
          <div className="section-heading">
            <span>Copy this</span>
            <h2>One field example</h2>
          </div>
          <pre>{addFieldCode}</pre>
        </article>
        <article>
          <div className="section-heading">
            <span>Only if your server needs it</span>
            <h2>Read the real value</h2>
          </div>
          <pre>{readOnServerCode}</pre>
        </article>
      </section>

      <section className="api-intro">
        <p className="eyebrow">Live API proof</p>
        <h2>These boxes are live responses from this demo app.</h2>
      </section>

      <section className="api-grid" aria-label="Live API responses">
        <ApiResponsePanel
          eyebrow="Normal collection API"
          title="No plaintext"
          value={demo.collectionRead}
        />
        <ApiResponsePanel
          eyebrow="Protected collection endpoint"
          title="Real hidden value"
          value={demo.collectionEndpoint}
        />
        <ApiResponsePanel
          eyebrow="Normal global API"
          title="Globals are safe too"
          value={demo.globalRead}
        />
        <ApiResponsePanel
          eyebrow="Protected global endpoint"
          title="Real hidden global value"
          value={demo.globalEndpoint}
        />
      </section>
    </main>
  )
}
