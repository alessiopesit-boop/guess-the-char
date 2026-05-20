# Guess the Char

Un quiz interattivo per imparare a riconoscere a colpo d'occhio i sistemi di scrittura del mondo.
Da hiragana a hangul, da devanagari ad arabo: viene mostrato un carattere e devi indovinare a quale scrittura appartiene.

## Funzionalita'

- Quattro modalita' di gioco: Allenamento libero, Sfida a tempo (60s), Survival (3 vite) e Sfida giornaliera deterministica con griglia emoji condivisibile.
- 17 sistemi di scrittura raggruppati per famiglia (Asia orientale, Sud-est asiatico, indiane, mediorientali, europee).
- Pagina dei traguardi con dieci obiettivi, statistiche per-scrittura e sezioni di approfondimento.
- Impostazioni di accent, animazioni, modalita' per daltonici, suoni e vibrazione.
- Interfaccia disponibile in italiano e inglese, persistenza in `localStorage`.

## Stack

App Angular 21 a single-page application (standalone components, signals, OnPush, zoneless change detection). Niente backend: tutto lato client.

## Come usarla

Sito live (allineato all'ultimo tag): [alessiopesit-boop.github.io/guess-the-char](https://alessiopesit-boop.github.io/guess-the-char/).

In locale:

```bash
npm install
npm start
# poi http://localhost:4200
```

Per una build di produzione:

```bash
npm run build
```

## Versioni

Vedi il [CHANGELOG](CHANGELOG.md) per l'elenco delle modifiche.

## Licenza

MIT
