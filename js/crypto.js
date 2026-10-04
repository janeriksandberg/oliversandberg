/* Klientside-kryptering: PBKDF2 (SHA-256) -> AES-256-GCM.
   Spørsmålsdataene ligger kryptert i data/questions.enc.js og dekrypteres i nettleseren. */
const Vault = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  async function deriveKey(password, salt, iterations) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
    );
  }

  async function unlock(password, blob) {
    if (!blob || !blob.ct) throw new Error('Mangler data');
    if (!crypto.subtle) throw new Error('Nettleseren mangler Web Crypto (krever https eller localhost).');
    const key = await deriveKey(password, b64(blob.salt), blob.iterations || 200000);
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct));
      return JSON.parse(dec.decode(plain));
    } catch (e) {
      throw new Error('Feil passord');
    }
  }
  return { unlock };
})();
