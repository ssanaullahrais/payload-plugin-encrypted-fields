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
  field?: { admin?: { description?: string; disabled?: boolean; readOnly?: boolean; width?: string }; label?: string; name?: string }
}) {
  const { value, setValue, initialValue } = useField<string>({ path })
  const [touched, setTouched] = React.useState(false)
  const hasSavedValue = Boolean(initialValue)
  const isClearing = touched && value === ""
  const label = field?.label ?? field?.name ?? "Secret"
  const readOnly = Boolean(field?.admin?.readOnly || field?.admin?.disabled)
  const adminWidth = field?.admin?.width
  const rowWidth =
    typeof adminWidth === "string" && adminWidth.endsWith("%")
      ? `calc(${adminWidth} - 10px)`
      : adminWidth

  return (
    <div
      className="field-type text"
      style={{
        flexBasis: rowWidth,
        marginBottom: "var(--base)",
        width: rowWidth ?? "100%",
      }}
    >
      <FieldLabel label={label} path={path} />
      <div
        style={{
          display: "flex",
          gap: 8,
        }}
      >
        <input
          type="password"
          autoComplete="new-password"
          disabled={readOnly}
          readOnly={readOnly}
          value={touched ? (value ?? "") : ""}
          placeholder={
            hasSavedValue && !touched
              ? "•••••••••••••••••••• (saved — type to replace)"
              : isClearing
                ? "Value will be cleared on save"
                : "Enter value"
          }
          onChange={(event) => {
            if (readOnly) return
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
        {hasSavedValue && !readOnly ? (
          <button
            type="button"
            onClick={() => {
              setTouched(true)
              setValue("")
            }}
            style={{
              minHeight: 40,
              padding: "0 12px",
              borderRadius: 4,
              border: "1px solid var(--theme-elevation-150)",
              background: "var(--theme-elevation-50)",
              color: "inherit",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {field?.admin?.description && path ? (
        <FieldDescription description={field.admin.description} path={path} />
      ) : null}
    </div>
  )
}
