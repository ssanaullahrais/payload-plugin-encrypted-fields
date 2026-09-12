type ScenarioCardProps = {
  eyebrow: string
  title: string
  body: string
  code: string
}

export function ScenarioCard({ body, code, eyebrow, title }: ScenarioCardProps) {
  return (
    <article>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <code>{code}</code>
    </article>
  )
}
