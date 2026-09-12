export function DemoHero() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Payload secret fields</p>
        <h1>Save private keys in Payload without showing them to everyone.</h1>
        <p className="lead">
          Your team can store Cloudflare tokens, SMTP passwords, API keys, and webhook secrets in Payload.
          The real value is encrypted in the database, hidden from normal API responses, and still usable by your server when it needs to call another service.
        </p>
        <div className="actions">
          <a href="/admin">Open admin</a>
          <a href="/plugin-test">View raw test page</a>
          <a href="https://github.com/ssanaullahrais/payload-plugin-encrypted-fields">GitHub docs</a>
        </div>
      </div>
      <aside className="login-card" aria-label="Demo login">
        <span>Demo login</span>
        <strong>admin@admin.com</strong>
        <code>password</code>
      </aside>
    </section>
  )
}
