type CodeExampleProps = {
  code: string
  eyebrow: string
  title: string
}

export function CodeExample({ code, eyebrow, title }: CodeExampleProps) {
  return (
    <article className="code-example">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <pre>{code}</pre>
    </article>
  )
}
