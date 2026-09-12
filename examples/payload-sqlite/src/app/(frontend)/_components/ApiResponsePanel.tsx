type ApiResponsePanelProps = {
  eyebrow: string
  title: string
  value: unknown
}

export function ApiResponsePanel({ eyebrow, title, value }: ApiResponsePanelProps) {
  return (
    <div className="api-panel">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
