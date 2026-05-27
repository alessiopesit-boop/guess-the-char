# Guess the Char

Un quiz interattivo per imparare a riconoscere a colpo d'occhio i sistemi di scrittura del mondo.
Da hiragana a hangul, da devanagari ad arabo: viene mostrato un carattere e devi indovinare a quale scrittura appartiene.

## Funzionalita'

- Quattro modalita' di gioco: Allenamento libero, Sfida a tempo (60s), Survival (3 vite) e Sfida giornaliera deterministica con griglia emoji condivisibile.
- 17 sistemi di scrittura raggruppati per famiglia (Asia orientale, Sud-est asiatico, indiane, mediorientali, europee).
- Pagina dei traguardi con dieci obiettivi, statistiche per-scrittura e sezioni di approfondimento.
- Account opzionale (email/password o Google): senza login giochi subito, con login i progressi si sincronizzano tra dispositivi.
- Funzioni sociali: profilo pubblico, classifica giornaliera e di sempre, ricerca utenti, amicizie e sfide 1-vs-1 tra amici.
- Cancellazione account direttamente dall'app, e pagina privacy bilingue.
- Impostazioni di accent, animazioni, modalita' per daltonici, suoni e vibrazione.
- Interfaccia disponibile in italiano e inglese, installabile come app (PWA).

## Stack

App Angular 21 a single-page application (standalone components, signals, OnPush, zoneless change detection). Backend opzionale su Firebase (Auth + Firestore) per login e sincronizzazione dei progressi in cloud; senza login l'app funziona interamente lato client, con persistenza in `localStorage`.

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

Proprietaria, tutti i diritti riservati. Il codice e' pubblicamente visibile ma **non e' open source**: vedi [LICENSE](LICENSE). Nessun uso, copia, modifica, hosting o redistribuzione senza permesso scritto di Alessio Pes.
