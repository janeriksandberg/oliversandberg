# Paragrafagenten

Et nettleserspill for å pugge forvaltningsrett til eksamen. Hvert nivå er ett kapittel i Eckhoff: *Forvaltningsrett*, og alle spørsmål er flervalg med ordrett sitat fra boken som belegg.

Spillet ligger på GitHub Pages og er passordbeskyttet.

## Hvordan passordet fungerer

Spørsmålsbanken ligger kryptert i `data/questions.enc.json` (AES-256-GCM, nøkkel avledet fra passordet med PBKDF2-SHA256, 310 000 runder). Nettleseren dekrypterer den når passordet tastes inn. Klarteksten og passordet ligger ikke i repoet.

Dette er beskyttelse på klientsiden: selve spillkoden er offentlig, men spørsmålene kan ikke leses uten passordet.

## Oppdatere spørsmålene

Klarteksten ligger i prosjektmappa (`forvaltningsrett-spill/questions.json`), ikke her. Etter endringer:

```
SPILL_PASSORD='<passord>' node tools/encrypt.mjs questions.json data/questions.enc.json
```

Krever Node 18 eller nyere. Ingen andre avhengigheter.

## Kjøre lokalt

```
python3 -m http.server 8000
```

Åpne http://localhost:8000. (Spillet må serveres over http, ikke åpnes som fil.)
