# Innhold (klartekst)

Spørsmålene ligger i klartekst i `content/questions/kapNN.json` (én fil per kapittel). Mappa er
gitignorert fordi repoet er offentlig og spillet skal være passordbeskyttet. Ikke legg klartekst,
kildehenvisninger eller beskrivelser av innholdet noe annet sted i repoet.

- Hent klartekst fra den publiserte fila: `node tools/decrypt-data.mjs "<passord>"`
- Bygg kryptert fil etter endringer: `node tools/build-data.mjs "<passord>"`

Format per fil:

```json
{ "chapter": 12, "title": "Habilitet",
  "questions": [ { "q": "...", "options": ["A","B","C","D"], "answer": 0, "explain": "...", "source": "sitat som vises etter svaret" } ] }
```
