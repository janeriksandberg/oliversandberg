// Dekrypterer spørsmålsbanken i nettleseren (AES-GCM, nøkkel avledet fra passordet med PBKDF2-SHA256).
const Vault = (() => {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function open(password) {
    const res = await fetch('data/questions.enc.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Fant ikke spørsmålsfila');
    const box = await res.json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(box.salt), iterations: box.iter, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    let plain;
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
    } catch (e) {
      const err = new Error('Feil passord'); err.badPassword = true; throw err;
    }
    return JSON.parse(new TextDecoder().decode(plain));
  }
  return { open };
})();
