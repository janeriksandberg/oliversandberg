# Oppdrag Eksamen

Et passordbeskyttet puggespill som kjører i nettleseren og hostes på GitHub Pages (oliversandberg.no).

## Slik spiller du
- Skriv inn passordet. Innholdet ligger kryptert i `data/questions.enc.js` og dekrypteres i nettleseren.
- Velg et level. Du møter 10 fiender og til slutt sjefen **Sensor**. Svar riktig for å skyte dem ned
  (klikk, eller tastene **1–4** / **A–D**). Feil svar koster et liv, og spørsmålet kommer tilbake senere i runden.
- Nytt våpen for hver del. Tre riktige på rad gir *Overladet* (×2 poeng), seks på rad gir *Rettskraft* (×3).
- **Treningsleir** repeterer spørsmålene du har bommet på. **Eksamensmodus** blander 30 spørsmål fra alle åpne levels.
- Innstillinger (tannhjulet): lyd, musikk, tidspress av/på, skjermristing, automatisk «fortsett».

Fremgang lagres lokalt i nettleseren (localStorage).

## Struktur
```
index.html            spillet
css/style.css
js/crypto.js          PBKDF2 + AES-GCM-dekryptering (Web Crypto)
js/audio.js           syntetiserte lydeffekter og musikk (Web Audio)
js/engine.js          canvas-motor (figur, fiender, droner, prosjektiler, partikler)
js/app.js             spill-logikk, kart, lagring
data/questions.enc.js kryptert innhold (generert)
tools/build-data.mjs  krypterer content/questions/*.json -> data/questions.enc.js
tools/decrypt-data.mjs dekrypterer tilbake til content/questions/
content/              klartekst (gitignorert, se content/README.md)
```

## Endre innholdet
```
node tools/decrypt-data.mjs "<passord>"   # henter klartekst til content/questions/
# rediger content/questions/kapNN.json
node tools/build-data.mjs "<passord>"     # bygger ny kryptert fil
git commit -am "Oppdatert innhold" && git push
```
Krever Node 20+. Ingen andre avhengigheter.

## Om sikkerheten
Repoet er offentlig, så verken passordet eller innholdet ligger i klartekst noe sted i repoet eller på siden.
Innholdet er kryptert med AES-256-GCM, med nøkkel avledet fra passordet via PBKDF2-SHA256 (600 000 iterasjoner),
og alt dekrypteres i nettleseren. Dette er beskyttelse på klientsiden: den som har passordet kan lese innholdet.
Siden er merket `noindex`.
