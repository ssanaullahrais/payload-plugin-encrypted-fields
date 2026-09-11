"use client"

import * as React from "react"
import { FieldDescription, FieldLabel, useField } from "@payloadcms/ui"

/**
 * Masked `<input type="password">` for fields built with `encryptedField()`.
 * Payload's default text field shows the live value in plain text — fine
 * for non-secrets, not for this. Loads blank with a "saved — type to
 * replace" placeholder rather than the real decrypted value (which never
 * reaches the browser in the first place — see field.ts); typing replaces
 * it. Leaving it untouched keeps whatever is already stored.
 */
export function EncryptedFieldInput({
  path,
  field,
}: {
  path?: string
  field?: { admin?: { description?: string }; label?: string; name?: string }
}) {
  const { value, setValue, initialValue } = useField<string>({ path })
  const [touched, setTouched] = React.useState(false)
  const hasSavedValue = Boolean(initialValue)
  const label = field?.label ?? field?.name ?? "Secret"

  return (
    <div className="field-type text" style={{ marginBottom: 0, width: "100%" }}>
      <FieldLabel label={label} path={path} />
      <input
        type="password"
        autoComplete="new-password"
        value={touched ? (value ?? "") : ""}
        placeholder={hasSavedValue && !touched ? "•••••••••••••••••••• (saved — type to replace)" : "Enter value"}
        onChange={(event) => {
          setTouched(true)
          setValue(event.target.value)
        }}
        style={{
          appearance: "none",
          boxSizing: "border-box",
          minHeight: 40,
          width: "100%",
          padding: "8px 12px",
          borderRadius: 4,
          background: "var(--theme-input-bg)",
          border: "1px solid var(--theme-elevation-150)",
          color: "inherit",
        }}
      />
      {field?.admin?.description && path ? (
        <FieldDescription description={field.admin.description} path={path} />
      ) : null}
    </div>
  )
}
