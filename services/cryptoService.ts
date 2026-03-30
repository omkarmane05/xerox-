
/**
 * Zero-Knowledge Encryption Service
 * Uses Web Crypto API (AES-GCM) for Client-Side Encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 100000;

/**
 * Derives a cryptographic key from a simple 4-digit OTP
 * @param otp The 4-digit OTP
 * @param salt A unique salt (e.g. jobId) to prevent rainbow table attacks
 */
async function deriveKey(otp: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(otp),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a file using the provided OTP
 */
export async function encryptFile(file: File, otp: string, jobId: string): Promise<Blob> {
  const key = await deriveKey(otp, jobId);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const fileBuffer = await file.arrayBuffer();

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    fileBuffer
  );

  // Prepend the IV to the encrypted data so we can use it for decryption
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return new Blob([result], { type: 'application/octet-stream' });
}

/**
 * Decrypts a blob using the provided OTP
 */
export async function decryptFile(encryptedBlob: Blob, otp: string, jobId: string, originalMimeType: string): Promise<Blob> {
  const key = await deriveKey(otp, jobId);
  const fullBuffer = await encryptedBlob.arrayBuffer();
  const fullArray = new Uint8Array(fullBuffer);

  const iv = fullArray.slice(0, 12);
  const encryptedData = fullArray.slice(12);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    encryptedData
  );

  return new Blob([decryptedBuffer], { type: originalMimeType });
}
