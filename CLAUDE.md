# CLAUDE.md

Istruzioni per Claude Code (e qualunque altro assistente AI compatibile) che lavora su questo repo. Questo file viene caricato automaticamente all'inizio di ogni sessione dalla root del progetto, quindi vale come "memoria di progetto" condivisa.

## Regola d'oro: tieni aggiornati CLAUDE.md e README.md

**Ogni volta che modifichi il codice in modo non banale, aggiorna anche questo file (CLAUDE.md)** se la modifica:

- introduce o rimuove una dipendenza, una libreria, un dataset esterno;
- cambia una convenzione (naming, struttura del file, pattern di stato, persistenza in `localStorage`, ecc.);
- cambia il flusso utente principale (selezione famiglie, quiz, risposta, scoring);
- aggiunge una nuova lingua dell'interfaccia, una nuova famiglia di scritture, un nuovo dataset;
- modifica il comportamento di pubblicazione (Pages, CI, workflow);
- introduce un vincolo non ovvio (workaround, bug noto, limite di un'API).

**Aggiorna anche `README.md`** quando una modifica e' significativa per chi legge il repo da fuori (chiunque apra il sorgente su GitHub): nuova feature visibile, cambio dell'URL del sito, requisiti di setup. Il README e' la facciata pubblica del progetto, deve restare sintetico ma aggiornato.

Se la modifica e' una piccola correzione (typo, refactor locale, rinomina di una variabile privata, fix CSS puntuale), **non** serve aggiornare ne' CLAUDE.md ne' README. In dubbio: aggiorna CLAUDE.md (interno) e valuta se anche README (esterno).

Aggiornare significa: modificare la sezione gia' esistente che descrive l'area toccata. Non aggiungere log di modifiche o changelog qui, il `git log` e il `CHANGELOG.md` (gestito da release-please, vedi sotto) sono le fonti di verita' per la cronologia.

## Cos'e' il progetto

"Guess the Char" e' un quiz interattivo che mostra un carattere preso da uno dei sistemi di scrittura del mondo (CJK, sud-est asiatico, indiano, mediorientale, europeo, ecc.) e chiede all'utente a quale scrittura appartiene. Quattro modalita': Allenamento libero, Sfida a tempo, Survival, Sfida giornaliera deterministica. Niente account ne' backend per ora, persistenza solo `localStorage`. Tono: gioco-quiz, palette dark, design pulito.

## Stack

- **Angular 21+** standalone components, signals, `OnPush`, zoneless change detection. Niente NgModules.
- **TypeScript strict**, build via `@angular/build` (esbuild). Niente test framework configurato in questa fase; `tsconfig.spec.json` resta come placeholder per il giorno in cui aggiungeremo vitest.
- **Routing** con Angular Router e **`withHashLocation()`**: gli URL hanno la forma `/#/home`, `/#/game?mode=training`, ecc. Scelta motivata da GitHub Pages: niente trick di `404.html`, refresh sempre funzionante.
- **Stato globale** in un service con signals (`AppStateService`), persistito automaticamente in `localStorage` (chiave `gtc.state`) via `effect`. La lingua UI vive in un service separato (`I18nService`, chiave `gtc.lang`).
- **i18n**: oggetti TypeScript IT/EN in `src/app/core/i18n/strings.ts`. Italiano e' la lingua di default; chiavi nuove vanno aggiunte sia in IT che in EN.
- **Stili**: un singolo `src/styles.css` globale (importato dal prototipo Claude Design as-is, classi `.btn`, `.card`, `.pill`, `.glyph-stage`, ecc.) + CSS scoped per i componenti che hanno bisogno di stili specifici.
- **Niente backend**: lo stato e' solo locale al browser. Le aree social (login, profilo pubblico, leaderboard, sfide tra amici) sono stub "In arrivo" in attesa della 1.1.0 con Firebase Auth + Firestore.

## Struttura

```
.
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.spec.json
├── public/
│   └── favicon.ico
├── src/
│   ├── index.html           # link a Google Fonts del design
│   ├── main.ts              # bootstrap dell'app standalone
│   ├── styles.css           # stylesheet globale del design (~42 KB)
│   └── app/
│       ├── app.config.ts    # provideRouter (hash), providers root
│       ├── app.routes.ts    # tabella route + onboardedGuard
│       ├── app.ts           # root component, applica i token CSS del tema
│       ├── core/
│       │   ├── audio/       # SoundService, HapticsService
│       │   ├── data/        # SCRIPTS, GROUPS, BADGES, quiz/random helpers, AVATARS
│       │   ├── guards/      # onboardedGuard
│       │   ├── i18n/        # STRINGS IT/EN + I18nService
│       │   └── state/       # AppStateService + tipi AppState
│       ├── features/        # una cartella per ogni schermata
│       │   ├── badges/
│       │   ├── daily-result/
│       │   ├── game/
│       │   ├── glyph-detail/
│       │   ├── home/
│       │   ├── onboarding/
│       │   ├── script-detail/
│       │   ├── selection/
│       │   ├── session-result/
│       │   └── settings/
│       └── shared/          # componenti UI condivisi (Logo, Icon, AppBar, ecc.)
├── README.md
├── CHANGELOG.md             # generato/aggiornato da release-please
├── LICENSE                  # MIT
├── CLAUDE.md                # questo file
├── release-please-config.json
├── .release-please-manifest.json
└── .github/
    ├── workflows/
    │   ├── release.yml      # release-please + riscrittura body Release/PR
    │   └── deploy.yml       # GitHub Pages al release event (npm ci + ng build)
    └── scripts/
        └── release-notes.py # genera "In sintesi + Dettagli" dai commit
```

### Convenzioni

- **Componenti**: standalone (mai NgModules), `ChangeDetectionStrategy.OnPush`, naming Angular 21 senza suffisso `.component.ts` (es. `home.ts` / `home.html` / `home.css`, classe `export class Home`).
- **Reattivita'**: solo signals e computed. Niente RxJS dentro la logica di stato; `toSignal(this.route.paramMap)` e' il pattern per leggere query/path params dei route.
- **Stato**: tutto cio' che persiste tra sessioni passa da `AppStateService` (`appState.update({...})` o `appState.patch(s => ({...}))`). Niente accessi diretti a `localStorage` nei componenti.
- **i18n**: stringhe in `core/i18n/strings.ts`. Le chiavi sono fortemente tipate (`StringKey`); aggiungerne una nuova obbliga a tradurla in entrambe le lingue.
- **Dataset scritture**: `core/data/scripts.ts` con `SCRIPTS` (`ReadonlyArray<ScriptInfo>`) + `GROUPS`. Estendere il tipo `ScriptInfo` con nuovi campi e' OK; rinominare un id e' breaking change (perche' gli id vivono dentro `state.selected` di utenti gia' utilizzatori).
- **Stili dei componenti**: prima riusare classi globali di `src/styles.css` (es. `.card`, `.pill`, `.btn-primary`); ricorrere a CSS scoped nel componente solo per layout/animazioni nuovi.

## Comandi

```bash
npm install              # installa dipendenze
npm start                # ng serve, dev server su http://localhost:4200
npm run build            # build di produzione in dist/guess-the-char/browser/
```

Sia `npm start` sia `npm run build` lanciano automaticamente lo step
`scripts/generate-build-info.mjs`, che scrive `src/build-info.ts`
(in `.gitignore`) con `version` (da `.release-please-manifest.json`)
e `gitHash` (da `git rev-parse --short HEAD`). Il file viene rigenerato
a ogni avvio; serve al footer in basso a destra che mostra:

- in dev (`npm start`): l'hash di commit corrente seguito da `· dev`;
- in produzione (`npm run build`): solo `vX.Y.Z`, piccolo e discreto.

Se modifichi i path del manifest o lo schema del file generato, aggiorna
sia `app.ts` (campo `buildLabel`) sia il template `app.html`.

Niente lint, ne' test (per ora) ne' formatter configurato come task npm. Prettier e' presente come devDep ma non invocato da CI: lo usiamo come default dell'editor.

Per simulare un deploy locale stile Pages:

```bash
npm run build -- --base-href=/guess-the-char/
npx http-server dist/guess-the-char/browser/
```

## Branching e Pull Request

Flow stile GitHub Flow: niente push diretti su `main`, tutto passa da una PR.

### Branch

Crea sempre un branch dal `main` aggiornato. Prefissi convenzionali (servono solo a te per orientarti, non c'e' validazione automatica):

- `feat/<slug>`: feature nuova rivolta all'utente.
- `fix/<slug>`: bugfix.
- `chore/<slug>`: lavori interni (build, CI, dipendenze, riordino).
- `docs/<slug>`: modifiche solo a documentazione (incluso CLAUDE.md).
- `refactor/<slug>`: refactor a comportamento invariato.

Esempi: `feat/script-armenian`, `fix/score-reset-edge-case`, `chore/bump-actions-versions`.

### Scope di una PR

**Una PR copre uno scope logico.** Due bug non correlati, anche piccoli, vanno in due PR separate. Regola pratica: se lo `scope` del Conventional Commit dovrebbe essere diverso tra una modifica e l'altra, sono due PR (es. `fix(ui):` + `fix(scoring):` non si bundlano).

Vale anche se si tocca lo stesso file: se `index.html` riceve un fix UI al menu lingua e uno separato al calcolo del punteggio, due PR. Il refactor "di passaggio" mentre si sistema altro va evitato; se serve, una `refactor:` dedicata.

Eccezione: ritocchi adiacenti che condividono lo stesso "perche'" possono stare in una sola PR. Tipico esempio: una pass di responsiveness mobile che tocca diverse sezioni e ha un solo motivo ("rendere il sito leggibile su iPhone") puo' stare in `fix(ui):` o `fix(mobile):` unico. Ma se i fix sono indipendenti, sono due PR.

Perche': PR piccole e mono-scope sono piu' rapide da revieware, piu' facili da rollbaccare e generano release notes piu' pulite.

### Commit: Conventional Commits + body discorsivo

Tutti i commit (e i titoli delle PR) seguono [Conventional Commits](https://www.conventionalcommits.org/).

- Il **subject** e' la riga breve e tecnica, sempre nel formato `tipo(scope opzionale): cosa`. Serve a release-please per capire il tipo di cambio (bump version) e per generare il **bullet** dell'indice nella GitHub Release (subject ripulito del prefisso e capitalizzato).
- Il **body** e' una **descrizione user-facing breve, 1-2 frasi**, dal punto di vista di chi visita il sito (non dello sviluppatore). Niente nomi di file, regole CSS, dettagli implementativi a meno che non sia il punto. Compare nella sezione "Dettagli" della GitHub Release sotto il titoletto omonimo.

Anti-esempi di body troppo tecnici:

- ❌ `Spostato il toggle "Reset score" da un onclick inline a un addEventListener nel DOMContentLoaded.` (chi visita non sa cosa significhi)
- ✅ `Il pulsante "Reset" ora si attiva subito al caricamento della pagina invece di aspettare il primo click.`

**Niente hard-wrap a 72 caratteri** nel body. La vecchia convenzione "git da terminale" spezza le righe a 72 chars, ma GitHub Flavored Markdown rende ogni newline singolo come `<br>` nelle Release: le frasi appaiono spezzate a metà. Scrivi **una frase per riga lunga** (anche 200 chars, non importa), e separa i paragrafi con una **riga vuota**. Lo step Python nel workflow `release.yml` ha comunque un `unwrap_paragraphs()` che ricongiunge i wrap, ma e' un cerotto: meglio non spezzarle alla fonte.

Tipi e mapping:

| Tipo | Bump | Appare nella Release? | Etichetta |
|---|---|---|---|
| `feat:` | MINOR | si | Novita' |
| `fix:` | PATCH | si | Correzioni |
| `perf:` | PATCH | si | Performance |
| `refactor:` | PATCH | si | Refactor |
| `chore:` | nessuno | no | (storia git) |
| `docs:` | nessuno | no | (storia git) |
| `test:` | nessuno | no | (storia git) |
| `ci:`, `build:`, `style:` | nessuno | no | (storia git) |
| `feat!:` o `BREAKING CHANGE:` nel body | MAJOR | si, in cima | Modifiche incompatibili |

Esempio di commit per una nuova feature (caso tipico, raccomandato). Subject tecnico, body user-facing breve, niente wrap a 72 chars:

```
feat(scripts): aggiungi alfabeto armeno

L'armeno (Հայերեն) entra nelle scritture mediorientali con 38 caratteri base. Disponibile come scrittura selezionabile, con link a Wiktionary per ciascun carattere.
```

Body **consigliato sempre** per `feat:`, `fix:`, `perf:`, `refactor:`. Se proprio manca (cambio piccolissimo e ovvio), il workflow fa un fallback: usa il subject ripulito del prefisso e capitalizzato.

### Merge: squash sempre

Strategia per le PR: **Squash and merge**.

- Il **titolo della PR** = subject del commit squashato = Conventional Commit. release-please lo legge da li'.
- Il **body della PR** = body del commit squashato = descrizione discorsiva. La Release lo prende da qui.

Quindi quando apri la PR cura titolo **e** descrizione: insieme diventano il commit, da cui release-please costruisce la release. La PR e' la fonte di verita'.

### Pulizia branch dopo il merge

Il branch **remoto** viene cancellato in automatico dal repo (setting `delete_branch_on_merge: true`). Lato **locale** invece i branch restano sulla tua macchina anche dopo che la PR e' stata mergiata. Ogni tanto vale la pena ripulire:

```bash
git fetch --prune                       # rimuove i tracking branch (origin/...) gia' scomparsi sul remoto
git branch | grep -vE '^\*|main$' | xargs -r git branch -D
                                        # cancella tutti i branch locali eccetto main e quello corrente
```

Il `-D` (maiuscolo) ignora il check "branch gia' mergiato": serve perche' lo squash merge non lascia una merge-base diretta, quindi `git branch -d` non li riconoscerebbe come mergiati.

### Setup repo

Le impostazioni del repo (merge strategy, commit message di default, auto-delete branch, branch protection su `main`, workflow permissions) vengono applicate via API con un PAT fine-grained. Stato target:

- Merge: solo squash merging. `Allow merge commits` e `Allow rebase merging` disattivati.
- Default commit message dello squash: `PR_TITLE` + `PR_BODY`. Il commit su `main` eredita titolo e descrizione della PR.
- `Automatically delete head branches`: attivo (i branch sono auto-cancellati dopo il merge).
- Branch protection su `main`: PR obbligatoria (0 review richiesti), `Require linear history` attivo, `Allow force pushes` e `Allow deletions` disattivati.
- Workflow permissions: `Read and write` con `Allow GitHub Actions to create and approve pull requests` attivo (serve a release-please per aprire la Release PR).

## Versioning

Schema [SemVer](https://semver.org): `MAJOR.MINOR.PATCH`. La fonte di verita' e' il campo in `.release-please-manifest.json` (il release-type e' `simple`, quindi non c'e' nessun `package.json` da bumpare).

### Rilascio: lo fa release-please, non tu

Il rilascio e' completamente automatizzato dal workflow `.github/workflows/release.yml`, che usa [release-please](https://github.com/googleapis/release-please). Punto importante da tenere a mente: **la Release PR non la apri tu**, te la trovi gia' aperta dal bot. E **il numero di versione non lo scegli tu**, lo calcola il bot in base ai tipi dei commit accumulati dopo l'ultimo tag (`fix:` => PATCH, `feat:` => MINOR, `BREAKING CHANGE` => MAJOR).

Cosa succede in pratica:

1. Mergi su `main` un commit `feat:` o `fix:` (qualunque commit "rilasciabile" secondo Conventional Commits).
2. Il workflow `release.yml` parte ad ogni push su `main`. release-please apre **automaticamente** una PR speciale tipo `chore(main): release X.Y.Z` che contiene:
   - bump di `.release-please-manifest.json`;
   - aggiornamento di `CHANGELOG.md` con i commit dell'ultimo ciclo, raggruppati per tipo (Features, Bug Fixes, ecc.).

   Subito dopo, uno step dello stesso workflow **riscrive il body della Release PR** nello stesso stile "In sintesi" + "Dettagli" che vedrai nella Release pubblicata, cosi' chi la review vede gia' un'anteprima fedele delle release notes. Non serve aprire la PR e ritoccarla a mano: ad ogni nuovo commit rilasciabile la PR viene rigenerata e riscritta automaticamente.
3. Quella Release PR **resta aperta** e **si auto-aggiorna** ogni volta che mergi su `main` un nuovo commit. Se il commit e' rilasciabile, viene incluso nelle note e (se serve) cambia il bump (es. da PATCH a MINOR). Se e' `chore:` / `docs:` / `ci:` / `test:` viene mergiato comunque su `main`, fara' parte del tag finale, ma non comparira' nelle release notes ne' influenzera' il numero di versione.
4. **La tua unica decisione** e' quando rilasciare: quando ti sembra ci sia abbastanza materiale, mergi la Release PR. Solo allora release-please:
   - crea il tag git (`vX.Y.Z` con la `v`);
   - crea la GitHub Release;
   - lo step finale del workflow **riscrive il body della Release** in due sezioni: **In sintesi** in cima (bullet con il subject ripulito per ogni voce, raggruppati per tipo: Novita', Correzioni, Performance, Refactor, Modifiche incompatibili) e **Dettagli** sotto (titoletti `###` con il body discorsivo, solo per le voci che hanno un body).

   La logica di composizione delle note vive in `.github/scripts/release-notes.py` (riceve `--range`, stampa il body su stdout). Lo stesso script alimenta sia la riscrittura della Release pubblicata sia quella della Release PR in attesa di merge.

Cose che **non** devi fare a mano (rispetto a prima):

- Tag git: no, lo fa release-please.
- Modifiche a `CHANGELOG.md`: no, lo riscrive release-please. Eccezione: se vuoi correggere un refuso o aggiungere una nota a posteriori, puoi farlo in una PR separata di tipo `docs:`.

Modi di forzare la prossima versione (raramente serve):

- Commenta nella Release PR con `Release-As: 1.5.0` (o `release-as: 1.5.0`) per forzare un numero di versione preciso.
- `feat!:` o `BREAKING CHANGE:` in body di un commit forza un bump MAJOR.

### Convenzioni tag

- Prefisso `v` (`v1.0.0`, non `1.0.0`).
- Suffisso (`v1.1.0-beta.1`) farebbe prerelease, ma con release-please base non si usa: per prerelease serve config dedicato (non attivo qui).

## Deploy: GitHub Pages

Pubblicazione via GitHub Actions, workflow `.github/workflows/deploy.yml`.

**Trigger: solo Release pubblicata** (`on: release: types: [published]`). Cioe': quando mergi la Release PR di release-please nasce un tag + una GitHub Release; quel `release: published` fa partire il deploy. **I merge su `main` da soli non vanno live**: questa e' una scelta deliberata, cosi' il sito in produzione coincide sempre con un tag.

Conseguenze pratiche:

- Tra una release e l'altra, `main` accumula PR mergiate ma il sito live resta alla versione precedente. Per vedere l'ultimo `main` non rilasciato, apri `index.html` localmente.
- Se proprio serve mostrare a qualcuno un'anteprima di `main` non ancora rilasciato (demo, screenshot), si lancia a mano `Actions > Deploy to GitHub Pages > Run workflow` (trigger `workflow_dispatch`). Va considerato un'eccezione, non la norma.
- Per rilasciare in fretta dopo aver mergiato qualche PR, basta mergiare anche la Release PR che release-please tiene aperta: il deploy parte subito dopo.

Cose da sapere se lo modifichi:

- L'artifact Pages e' l'intera root del repo (eccetto `.github`, `LICENSE`, `README.md`, `CLAUDE.md`, `CHANGELOG.md`, manifest e config di release-please).
- `.nojekyll` (vuoto) e' presente alla root per impedire a Pages di processare i file via Jekyll.
- Prima pubblicazione: in *Settings > Pages* del repo va scelto "Source: GitHub Actions" una volta sola.

## Vincoli e cose da non fare

- **Non** rimuovere `withHashLocation()` da `app.config.ts` senza prima decidere come gestire le route refresh-friendly su Pages (servirebbe un `404.html` che ridireziona a `index.html`, e per ora non c'e').
- **Non** bypassare `AppStateService` con scritture dirette a `localStorage`: la chiave `gtc.state` ha uno schema mergiato col `DEFAULT_STATE` ed evita di rompere lo stato di utenti gia' registrati.
- **Non** introdurre librerie UI esterne (Material, PrimeNG, Tailwind) senza necessita': il design system del prototipo e' gia' coerente e pesato.
- **Non** rimuovere `.nojekyll` o cambiare il `base-href` in `deploy.yml` senza aggiornare entrambi insieme.
- **Non** committare `dist/`, `node_modules`, `.angular/cache`, ne' file con segreti.

## Note operative per l'assistente

- Quando ti viene chiesto di "fare X" rispondi in italiano (il proprietario lavora in italiano).
- Niente em-dash (`—`) e niente freccia (`→`) nei file di questo repo, ne' nei messaggi: usa virgole, due punti, parentesi, o parole ("a", "verso", "diventa").
- Prima di marcare un task come finito, controlla che il sito funzioni aprendolo localmente.
