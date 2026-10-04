// Krypterer spørsmålsbanken for publisering.
// Bruk: SPILL_PASSORD='...' node tools/encrypt.mjs <questions.json> data/questions.enc.json
// Klarteksten skal ALDRI sjekkes inn i repoet (repoet er offentlig).
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as c } from 'node:crypto';

const [src, dst] = process.argv.slice(2);
const pw = process.env.SPILL_PASSORD;
if (!src || !dst || !pw) { console.error('Bruk: SPILL_PASSORD=... node tools/encrypt.mjs <inn.json> <ut.json>'); process.exit(1); }

const iter = 310000;
const salt = c.getRandomValues(new Uint8Array(16));
const iv = c.getRandomValues(new Uint8Array(12));
const base = await c.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await c.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const plain = new TextEncoder().encode(JSON.stringify(JSON.parse(readFileSync(src, 'utf8'))));
const ct = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
const b64 = u => Buffer.from(u).toString('base64');
writeFileSync(dst, JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', cipher: 'AES-256-GCM', iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
console.log(`Kryptert ${plain.length} byte -> ${dst}`);
