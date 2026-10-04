#!/usr/bin/env node
/* Dekrypterer data/questions.enc.js tilbake til content/questions/kapNN.json
   Bruk:  node tools/decrypt-data.mjs "<passord>" */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const password = process.argv[2] || process.env.OE_PASSWORD;
if (!password) { console.error('Mangler passord'); process.exit(1); }
const js = readFileSync(path.join(root, 'data', 'questions.enc.js'), 'utf8');
const blob = JSON.parse(js.slice(js.indexOf('{'), js.lastIndexOf('}') + 1));
const b64 = s => Buffer.from(s, 'base64');
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(blob.salt), iterations: blob.iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
let plain; try { plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(blob.iv) }, key, b64(blob.ct)); } catch { console.error('Feil passord'); process.exit(2); }
const data = JSON.parse(new TextDecoder().decode(plain));
const out = path.join(root, 'content', 'questions'); mkdirSync(out, { recursive: true });
for (const c of data.chapters) writeFileSync(path.join(out, `kap${String(c.chapter).padStart(2, '0')}.json`), JSON.stringify(c, null, 2) + '\n');
console.log(`OK: ${data.chapters.length} kapitler skrevet til content/questions/`);
