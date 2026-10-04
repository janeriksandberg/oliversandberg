#!/usr/bin/env node
/* Krypterer content/questions/*.json -> data/questions.enc.js
   Bruk:  node tools/build-data.mjs "<passord>"   (eller sett env OE_PASSWORD)
   PBKDF2-SHA256 (200 000 iterasjoner) -> AES-256-GCM. Dekrypteres i nettleseren (js/crypto.js). */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = process.env.OE_SRC || path.join(root, 'content', 'questions');
const password = process.argv[2] || process.env.OE_PASSWORD;
if (!password) { console.error('Mangler passord: node tools/build-data.mjs "<passord>"'); process.exit(1); }

const files = readdirSync(srcDir).filter(f => /^kap\d+\.json$/.test(f)).sort();
const chapters = files.map(f => JSON.parse(readFileSync(path.join(srcDir, f), 'utf8')));
for (const c of chapters) for (const [i, q] of c.questions.entries()) {
  if (!q.q || !Array.isArray(q.options) || q.options.length !== 4 || !(q.answer >= 0 && q.answer <= 3)) throw new Error(`Ugyldig spørsmål ${c.chapter}:${i}`);
}
const plain = JSON.stringify({ built: new Date().toISOString(), chapters });

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iterations = 200000;
const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
const b64 = u => Buffer.from(u).toString('base64');
const blob = { v: 1, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), ct: b64(ct) };
writeFileSync(path.join(root, 'data', 'questions.enc.js'), `// Generert av tools/build-data.mjs ${new Date().toISOString()}. ${chapters.length} kapitler, ${chapters.reduce((s, c) => s + c.questions.length, 0)} spørsmål. Kryptert.\nwindow.ENC_DATA = ${JSON.stringify(blob)};\n`);
console.log(`OK: ${chapters.length} kapitler, ${chapters.reduce((s, c) => s + c.questions.length, 0)} spørsmål, ${(ct.length / 1024).toFixed(0)} kB kryptert -> data/questions.enc.js`);
