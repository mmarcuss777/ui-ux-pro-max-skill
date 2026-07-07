import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

// AES-256-GCM for integration tokens. Key lives in INTEGRATION_TOKEN_KEY
// (32 bytes, base64). Output format: base64(iv | authTag | ciphertext).
// Server-side only — never import this from a client component.

function key(): Buffer {
  const raw = process.env.INTEGRATION_TOKEN_KEY
  if (!raw) throw new Error("INTEGRATION_TOKEN_KEY is not set")
  const buf = Buffer.from(raw, "base64")
  if (buf.length !== 32) throw new Error("INTEGRATION_TOKEN_KEY must be 32 bytes (base64)")
  return buf
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64")
}

export function decryptToken(encoded: string): string {
  const buf = Buffer.from(encoded, "base64")
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const ct = buf.subarray(28)
  const decipher = createDecipheriv("aes-256-gcm", key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8")
}
