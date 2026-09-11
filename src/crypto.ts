import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const IV_LENGTH = 12 // AES-GCM standard nonce size

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest()
}

export function encryptValue(plaintext: string, secret: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", getKey(secret), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":")
}

export function decryptValue(stored: string, secret: string): string | null {
  const parts = stored.split(":")
  if (parts.length !== 3) return null
  const [ivHex, authTagHex, dataHex] = parts
  try {
    const decipher = createDecipheriv("aes-256-gcm", getKey(secret), Buffer.from(ivHex, "hex"))
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()])
    return decrypted.toString("utf8")
  } catch {
    return null
  }
}
