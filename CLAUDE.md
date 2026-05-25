# CLAUDE.md

Istruzioni per Claude Code (e qualunque altro assistente AI compatibile) che lavora su questo repo. Questo file viene caricato automaticamente all'inizio di ogni sessione dalla root del progetto, quindi vale come "memoria di progetto" condivisa.

## Regola d'oro: tieni aggiornati CLAUDE.md e README.md

**Ogni volta che modifichi il codice in modo non banale, aggiorna anche questo file (CLAUDE.md)** se la modifica:

- introduce o rimuove una dipendenza, uno script npm, una route, una schermata, un servizio core o un componente shared;
- cambia una convenzione (naming, struttura cartelle, prefisso selettori, pattern signal/effect, persistenza in `localStorage`, ecc.);
- cambia il flusso utente principale (onboarding, home, selezione, gioco, riepilogo);
- aggiunge una nuova lingua, palette o "tweak" runtime;
- modifica il comportamento di build/dev/test;
- introduce un vincolo non ovvio (workaround, bug noto, limite di un'API).

**Aggiorna anche `README.md`** quando una modifica e' significativa per chi legge il repo da fuori (chiunque apra il sorgente su GitHub): nuova feature visibile, cambio di comandi (npm scripts), cambio di stack o di flusso di sviluppo, nuovo URL del sito, requisiti di setup. Il README e' la facciata pubblica del progetto, deve restare sintetico ma aggiornato.

Se la modifica e' una piccola correzione (typo, refactor locale, rinomina di una variabile privata, fix CSS puntuale), **non** serve aggiornare ne' CLAUDE.md ne' README. In dubbio: aggiorna CLAUDE.md (interno) e valuta se anche README (esterno).

Aggiornare significa: modificare la sezione gia' esistente che descrive l'area toccata. Non aggiungere log di modifiche o changelog qui, il `git log` e' l'unica fonte di verita' per la cronologia.

## Cos'e' il progetto

Quiz interattivo single-page per imparare a riconoscere a colpo d'occhio i sistemi di scrittura del mondo: appare un glifo (hiragana, devanagari, arabo, greco, ecc.) e l'utente sceglie tra quattro opzioni. Quattro modalita': Allenamento libero, Sfida a tempo, Survival, Sfida giornaliera deterministica con griglia emoji condivisibile. Tono estetico: gioco-quiz, dark, palette ambra di default.

Persistenza dei progressi via `localStorage` per stato di gioco, lingua UI e preferenze visive. Login via Firebase Auth (Email/Password + Google) gia' attivo: l'utente puo' creare un account o continuare in modo anonimo. La sincronizzazione dei progressi nel cloud, profilo pubblico, classifica e sfide tra amici sono ancora stub "In arrivo".

## Stack

- **Angular 21.2+**, standalone components, `ChangeDetectionStrategy.OnPush` ovunque, **zoneless change detection** (`provideZonelessChangeDetection`).
- **Signals** (`signal`, `computed`, `effect`) per stato reattivo. Niente NgRx; RxJS solo come dipendenza implicita del Router (`toSignal(this.route.paramMap)` e' il pattern per leggere query/path params).
- **Routing**: `provideRouter` con path location standard (no `#` nelle URL) e scroll restoration "top". Su GitHub Pages il refresh su una route deep funziona via `public/404.html`: quando Pages non trova il path sul filesystem serve il 404, che salva l'URL richiesto in `sessionStorage` (chiave `gtc-redirect`) e fa redirect a `/guess-the-char/`. Lo script in `src/index.html` ripristina il path originale via `history.replaceState` prima del bootstrap Angular.
- **Styling**: un singolo `src/styles.css` globale (importato dal prototipo Claude Design as-is, classi `.btn`, `.card`, `.pill`, `.glyph-stage`, ecc., ~42KB) + CSS scoped per i componenti che hanno bisogno di layout o animazioni specifiche.
- **Build/test**: nuovo builder `@angular/build` (esbuild + vite dev server). Vitest e' presente come devDep ma non sono ancora configurati test; `tsconfig.spec.json` resta come placeholder.
- **Niente lint configurato**, Prettier presente come devDep ma non invocato da CI (usato come default dell'editor). Editor config in `.editorconfig`.
- **Backend**: pacchetto `firebase` v12 (Auth + Firestore). Wiring sotto `src/app/core/firebase/`. Finche' `firebase.config.ts` ha valori PLACEHOLDER l'app funziona "solo locale" (login disabilitato), vedi sezione "Firebase" piu' sotto per i passi di setup console.

## Struttura

```
src/
  index.html                # base href + link a Google Fonts (Bricolage Grotesque + Geist + Noto Sans <Script>)
  main.ts                   # bootstrap dell'app standalone
  styles.css                # stylesheet globale del design (~42 KB)
  app/
    app.config.ts           # provideRouter (path location + scroll top), provideZonelessChangeDetection
    app.routes.ts           # tabella route + onboardedGuard
    app.ts                  # root component: router-outlet + footer build stamp + applica i token CSS del tema
    core/
      audio/                # SoundService, HapticsService
      data/                 # SCRIPTS, GROUPS, BADGES, quiz/random helpers (mulberry32, seedFromDate, buildQuestion), AVATARS, fake-leaderboard, script-hints
      guards/               # onboardedGuard
      i18n/                 # STRINGS IT/EN + I18nService + helper t()
      state/                # AppStateService + tipi AppState + ACCENT_PALETTES
      build-info.ts         # versione corrente + contesto (dev/release) + hash di commit
      build-info.prod.ts    # variante usata in production via fileReplacements
    features/               # una cartella per ogni schermata
      badges/
      daily-result/
      game/
      glyph-detail/
      home/
      login/
      onboarding/
      profile/
      public-profile/
      script-detail/
      selection/
      session-result/
      settings/
    shared/                 # componenti UI condivisi (Logo, Icon, AppBar, LangSwitch, StreakPill, TimerRing, Lives, ConfirmDialog, TransitionWrap, ComingSoon)
scripts/                    # script Node usati come npm hook (postinstall, prestart, prebuild)
```

### Convenzioni

- **Selettori**: prefisso `app-` (default, configurato in `angular.json`). Mantienilo.
- **Componenti**: standalone (mai NgModules), `ChangeDetectionStrategy.OnPush`, naming Angular 21 senza suffisso `.component.ts` (es. `home.ts` / `home.html` / `home.css`, classe `export class Home`).
- **Lazy loading** di ogni schermata via `loadComponent: () => import(...)`. Quando aggiungi una pagina segui lo stesso pattern in `app.routes.ts`.
- **Reattivita'**: solo signals e computed. Niente RxJS dentro la logica di stato; `toSignal(this.route.paramMap)` per i parametri di route.
- **Stato globale**: signal dentro un service `@Injectable({ providedIn: 'root' })`. Effetto in costruttore per side-effect (DOM, localStorage). Vedi `AppStateService` e `I18nService` come modello.
- **Persistenza `localStorage`**: sempre dentro `try/catch` (ambienti senza storage). Chiavi con prefisso `gtc.` (`gtc.state` per lo stato di gioco, `gtc.lang` per la lingua). Tutto cio' che persiste tra sessioni passa da `AppStateService` (`appState.update({...})` o `appState.patch(s => ({...}))`). Niente accessi diretti a `localStorage` nei componenti.
- **i18n**: stringhe in `core/i18n/strings.ts`. Le chiavi sono fortemente tipate (`StringKey`); aggiungerne una nuova obbliga a tradurla in entrambe le lingue (IT default + EN). Per leggerle nei template usa `i18n.t('chiave')`.
- **Dataset scritture**: `core/data/scripts.ts` con `SCRIPTS` (`ReadonlyArray<ScriptInfo>`) + `GROUPS`. Estendere il tipo `ScriptInfo` con nuovi campi e' OK; rinominare un id e' breaking change (perche' gli id vivono dentro `state.selected` di utenti gia' utilizzatori).
- **Stili dei componenti**: prima riusare classi globali di `src/styles.css` (es. `.card`, `.pill`, `.btn-primary`, `.glyph-stage`, `.opt`, `.fb-bar`, ecc.); ricorrere a CSS scoped nel componente solo per layout/animazioni nuovi specifici.

### Servizi core (cosa fanno)

- `AppStateService` (`core/state/app-state.service.ts`): signal con lo stato persistito (selezione scritture, streak normale e giornaliero, accuracy, badge, preferenze utente come accent/motion/sound/haptics/showCodepoint/colorblind). Lettura iniziale da `localStorage` con merge sui default, scrittura automatica via `effect` a ogni cambio. La sfida giornaliera si resetta automaticamente al cambio di giorno.
- `I18nService` (`core/i18n/i18n.service.ts`): signal con la lingua corrente (`'it'` / `'en'`), `computed` sul dizionario corrente, helper `t(key)` per recuperare la stringa nel template. Persistenza su `localStorage` chiave `gtc.lang`.
- `SoundService` (`core/audio/sound.service.ts`): suoni del quiz generati live via Web Audio API (nessun file audio caricato). Rispetta automaticamente il toggle "Suoni" dello stato. Tre primitive: `playCorrect`, `playWrong`, `playTick`.
- `HapticsService` (`core/audio/haptics.service.ts`): vibrazione discreta tramite Vibration API sui dispositivi che la supportano, anch'essa governata dal toggle "Vibrazione" dello stato.
- `onboardedGuard` (`core/guards/onboarded.guard.ts`): `CanActivateFn` applicata a quasi tutte le route; se `state.onboarded` e' falso reindirizza a `/onboarding`. Da ricordare quando si aggiunge una route.

### Build info (dev vs release)

`core/build-info.ts` espone `APP_VERSION`, `BUILD_CONTEXT` (`'dev'` o `'release'`) e `BUILD_SHA` (hash short del commit, solo in dev). Il footer del root component lo usa per distinguere visivamente le build di sviluppo da quelle pubblicate:

- In **dev** (default, `npm start`): footer mostra `v0.2.0 · dev · abc1234`.
- In **release** (build di produzione, CI): footer mostra solo `v0.2.0`, niente suffisso "dev".

Il meccanismo:

- `src/app/core/build-info.ts` (committato): consumato dal codice, importa `BUILD_SHA` dal file local-only e `version` da `package.json`.
- `src/app/core/build-info.prod.ts` (committato): sostituisce `build-info.ts` in configuration `production` via `fileReplacements` di `angular.json`. Non importa `build-sha.local.ts`, ha `BUILD_CONTEXT = 'release'` e `BUILD_SHA = ''`.
- `src/app/core/build-sha.local.ts` (gitignored): contiene solo `export const BUILD_SHA = '<sha>'`. Autogenerato da `scripts/write-build-sha.mjs` ad ogni `npm install`/`start`/`build` (npm scripts `postinstall`/`prestart`/`prebuild`). Se git non e' disponibile, fallback a `'unknown'`.
- `scripts/write-build-sha.mjs`: legge `git rev-parse --short HEAD` e scrive il file.

Se modifichi questa logica: ricordati che il file `build-info.prod.ts` deve esistere e avere la stessa shape esportata, altrimenti il build di produzione fallisce.

## Comandi

```bash
npm start          # ng serve, dev server su http://localhost:4200
npm run build      # build di produzione in dist/guess-the-char/browser/
npm run watch      # build dev con --watch
npm test           # vitest (nessuna spec custom presente)
```

Non e' configurato `ng e2e`, non c'e' un comando di lint.

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

Vale anche se si tocca lo stesso file: se `src/styles.css` riceve un fix CSS al menu lingua e uno separato al feedback di gioco, due PR. Il refactor "di passaggio" mentre si sistema altro va evitato; se serve, una `refactor:` dedicata.

Eccezione: ritocchi adiacenti che condividono lo stesso "perche'" possono stare in una sola PR. Tipico esempio: una pass di responsiveness mobile che tocca quattro sezioni e ha un solo motivo ("rendere il sito leggibile su iPhone") puo' stare in `fix(ui):` o `fix(mobile):` unico. Ma se i fix sono indipendenti (un tap-highlight nelle impostazioni + un margin sbagliato nel feedback del quiz), sono due PR.

Perche': PR piccole e mono-scope sono piu' rapide da revieware, piu' facili da rollbaccare e generano release notes piu' pulite (un bullet per voce, ogni voce e' un cambio comprensibile a se' stante).

### Commit: Conventional Commits + body discorsivo

Tutti i commit (e i titoli delle PR) seguono [Conventional Commits](https://www.conventionalcommits.org/).

- Il **subject** e' la riga breve e tecnica, sempre nel formato `tipo(scope opzionale): cosa`. Serve a release-please per capire il tipo di cambio (bump version) e per generare il **bullet** dell'indice nella GitHub Release (subject ripulito del prefisso e capitalizzato).
- Il **body** e' una **descrizione user-facing breve, 1-2 frasi**, dal punto di vista di chi visita il sito (non dello sviluppatore). Niente nomi di file, regole CSS, signal/effect, regex e altro jargon tecnico a meno che non sia il punto. Compare nella sezione "Dettagli" della GitHub Release sotto il titoletto omonimo.

Anti-esempi di body troppo tecnici:

- ❌ `Sostituito flex-wrap: nowrap con flex-wrap: wrap nelle media query a 640px su .options.` (chi visita non sa cosa sia flex-wrap)
- ✅ `Su mobile le quattro risposte ora vanno a capo invece di scrollare fuori schermo a destra.`

- ❌ `Aggiunto effect() in app.ts che setta data-motion sull'html in base allo stato.` (e' un how-to per il dev)
- ✅ `Cambiare l'intensita' delle animazioni nelle impostazioni ora ha effetto immediato su tutta l'app.`

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

Nella Release pubblicata appare come bullet "Aggiungi alfabeto armeno" sotto la sezione "Novita'" (in cima, indice), e come blocco con `### Aggiungi alfabeto armeno` + il body discorsivo sotto "Dettagli". Il prefisso `feat(scripts):` non compare mai: viene ripulito e il subject capitalizzato.

Body **consigliato sempre** per `feat:`, `fix:`, `perf:`, `refactor:`. Se proprio manca (cambio piccolissimo e ovvio), il workflow fa un fallback: usa il subject ripulito del prefisso e capitalizzato. Esempio: `fix(footer): typo nel copyright` senza body diventa nella Release "Typo nel copyright.". Funziona ma e' meno bello: meglio scrivere il body.

### Merge: squash sempre

Strategia per le PR: **Squash and merge**.

- Il **titolo della PR** = subject del commit squashato = Conventional Commit. release-please lo legge da li'.
- Il **body della PR** = body del commit squashato = descrizione discorsiva. La Release lo prende da qui.

Quindi quando apri la PR cura titolo **e** descrizione: insieme diventano il commit, da cui release-please costruisce la release. La PR e' la fonte di verita'.

### Pulizia branch dopo il merge

Il branch **remoto** viene cancellato in automatico dal repo (setting `delete_branch_on_merge: true` gia' applicato). Lato **locale** invece i branch restano sulla tua macchina anche dopo che la PR e' stata mergiata. Ogni tanto vale la pena ripulire:

```bash
git fetch --prune                       # rimuove i tracking branch (origin/...) gia' scomparsi sul remoto
git branch | grep -vE '^\*|main$' | xargs -r git branch -D
                                        # cancella tutti i branch locali eccetto main e quello corrente
```

Il `-D` (maiuscolo) ignora il check "branch gia' mergiato": serve perche' lo squash merge non lascia una merge-base diretta, quindi `git branch -d` non li riconoscerebbe come mergiati.

### Setup repo: gia' applicato via API

Sul repo sono gia' attivi via API (con PAT fine-grained dell'account `alessiopesit-boop`): squash-only merge, `PR_TITLE` + `PR_BODY` come default del commit di squash, `Automatically delete head branches` attivo, branch protection su `main` con linear history e PR obbligatoria (0 review), workflow permissions in `Read and write` con creazione PR consentita (serve a release-please). Se vengono modificate a mano, si riapplicano via `gh api` (richiede `Administration: write` sul PAT).

## Versioning

Schema [SemVer](https://semver.org): `MAJOR.MINOR.PATCH`. La fonte di verita' e' il campo `version` in `package.json` (e `.release-please-manifest.json`). Da li' il footer la legge a build-time e la mostra sul sito.

### Rilascio: lo fa release-please, non tu

Il rilascio e' completamente automatizzato dal workflow `.github/workflows/release.yml`, che usa [release-please](https://github.com/googleapis/release-please). Punto importante da tenere a mente: **la Release PR non la apri tu**, te la trovi gia' aperta dal bot. E **il numero di versione non lo scegli tu**, lo calcola il bot in base ai tipi dei commit accumulati dopo l'ultimo tag (`fix:` => PATCH, `feat:` => MINOR, `BREAKING CHANGE` => MAJOR).

Cosa succede in pratica:

1. Mergi su `main` un commit `feat:` o `fix:` (qualunque commit "rilasciabile" secondo Conventional Commits).
2. Il workflow `release.yml` parte ad ogni push su `main`. release-please apre **automaticamente** una PR speciale tipo `chore(main): release X.Y.Z` che contiene:
   - bump di `package.json` e `.release-please-manifest.json`;
   - aggiornamento di `CHANGELOG.md` con i commit dell'ultimo ciclo, raggruppati per tipo (Features, Bug Fixes, ecc.).

   Subito dopo, uno step dello stesso workflow **riscrive il body della Release PR** nello stesso stile "In sintesi" + "Dettagli" che vedrai nella Release pubblicata, cosi' chi la review vede gia' un'anteprima fedele delle release notes. Non serve aprire la PR e ritoccarla a mano: ad ogni nuovo commit rilasciabile la PR viene rigenerata e riscritta automaticamente.
3. Quella Release PR **resta aperta** e **si auto-aggiorna** ogni volta che mergi su `main` un nuovo commit. Se il commit e' rilasciabile, viene incluso nelle note e (se serve) cambia il bump (es. da PATCH a MINOR). Se e' `chore:` / `docs:` / `ci:` / `test:` viene mergiato comunque su `main`, fara' parte del tag finale, ma non comparira' nelle release notes ne' influenzera' il numero di versione.
4. **La tua unica decisione** e' quando rilasciare: quando ti sembra ci sia abbastanza materiale, mergi la Release PR. Solo allora release-please:
   - crea il tag git (`vX.Y.Z` con la `v`);
   - crea la GitHub Release;
   - lo step finale del workflow **riscrive il body della Release** in due sezioni: **In sintesi** in cima (bullet con il subject ripulito per ogni voce, raggruppati per tipo: Novita', Correzioni, Performance, Refactor, Modifiche incompatibili) e **Dettagli** sotto (titoletti `###` con il body discorsivo, solo per le voci che hanno un body). Risultato: chi legge a colpo d'occhio vede l'indice; chi scrolla trova le descrizioni umane.

   La logica di composizione delle note vive in `.github/scripts/release-notes.py` (riceve `--range`, stampa il body su stdout). Lo stesso script alimenta sia la riscrittura della Release pubblicata sia quella della Release PR in attesa di merge.

Cosa NON apparira' mai nella Release PR perche' release-please li ignora dal bumping:

- `chore:`, `docs:`, `ci:`, `build:`, `style:`, `test:`, `refactor:` (eccezione: `refactor` appare comunque nelle note come "Refactor", ma non bumpa MAJOR).
- I commit di release-please stesso (`chore(main): release X.Y.Z`).

Quindi se mergi solo `chore:` / `docs:` la Release PR **non viene aperta**. Serve almeno un commit `fix:` / `feat:` / `perf:` da quando e' uscito l'ultimo tag.

**Non** modificare a mano `package.json`, `CHANGELOG.md` o creare tag git: tutto e' gestito da release-please. Unica eccezione: una correzione di refuso o nota a posteriori nel CHANGELOG, in una PR `docs:` separata.

Modi di forzare la prossima versione (raramente serve):

- Commenta nella Release PR con `Release-As: 1.5.0` (o `release-as: 1.5.0`) per forzare un numero di versione preciso.
- `feat!:` o `BREAKING CHANGE:` in body di un commit forza un bump MAJOR.

### Convenzioni tag

- Prefisso `v` (`v1.0.0`, non `1.0.0`).
- Suffisso (`v1.1.0-beta.1`) farebbe prerelease, ma con release-please base non si usa: per prerelease serve config dedicato (non attivo qui).

## Deploy: GitHub Pages

Pubblicazione su `https://alessiopesit-boop.github.io/guess-the-char/` via GitHub Actions, workflow `.github/workflows/deploy.yml`.

**Trigger: solo Release pubblicata** (`on: release: types: [published]`). Cioe': quando mergi la Release PR di release-please nasce un tag + una GitHub Release; quel `release: published` fa partire il deploy. **I merge su `main` da soli non vanno live**: questa e' una scelta deliberata, cosi' il sito in produzione coincide sempre con un tag e la versione mostrata nel footer non e' mai "falsa" (= sempre allineata al `package.json` di quel tag).

Conseguenze pratiche:

- Tra una release e l'altra, `main` accumula PR mergiate ma il sito live resta alla versione precedente. Per vedere l'ultimo `main` non rilasciato, build locale (`npm start` o `npm run build`).
- Se proprio serve mostrare a qualcuno un'anteprima di `main` non ancora rilasciato (demo, screenshot), si lancia a mano `Actions > Deploy to GitHub Pages > Run workflow` (trigger `workflow_dispatch`). Va considerato un'eccezione, non la norma.
- Per rilasciare in fretta dopo aver mergiato qualche PR, basta mergiare anche la Release PR che release-please tiene aperta: il deploy parte subito dopo.

Cose da sapere se lo modifichi:

- Il build di produzione viene fatto con `--base-href=/guess-the-char/`: lo richiede il fatto che il sito vive su un sottopath del dominio `*.github.io`. Se cambia il nome del repo, va aggiornato anche qui.
- Il workflow chiama `npm run build` (non `npx ng build`): cosi' parte lo step `prebuild` di `package.json` che scrive `build-sha.local.ts` (vedi sezione "Build info").
- L'output di Angular 21 con builder `@angular/build` finisce in `dist/guess-the-char/browser/`: e' la cartella caricata come artifact Pages.
- `public/404.html` e' il fallback SPA "rafgraph-style": GitHub Pages lo serve per qualunque path inesistente, lui salva `location.pathname + search + hash` in `sessionStorage.gtc-redirect` e redireziona a `/guess-the-char/`. `src/index.html` legge quel valore prima del bootstrap Angular e ripristina l'URL via `history.replaceState`. Cosi' i deep link `/guess-the-char/game` funzionano anche al refresh diretto. Viene copiato automaticamente nel `dist/` come asset.
- `.nojekyll` (vuoto, presente alla root) impedisce a Pages di processare i file via Jekyll. Lo step del workflow lo copia automaticamente in `_site/`.
- Prima pubblicazione: in *Settings > Pages* del repo va scelto "Source: GitHub Actions" una volta sola.
- Anche l'environment `github-pages` (creato in automatico la prima volta che Pages e' attivato) va sbloccato per i tag: di default consente deploy solo dal branch `main`, ma il nostro workflow parte dal tag `vX.Y.Z`. Una sola volta, aggiungere una "deployment branch policy" con `name: v*` e `type: tag` (via *Settings > Environments > github-pages > Deployment branches and tags*, oppure via `gh api -X POST repos/<owner>/<repo>/environments/github-pages/deployment-branch-policies -f name='v*' -f type='tag'`). Senza questo, il job `deploy` fallisce con "Tag X.Y.Z is not allowed to deploy to github-pages due to environment protection rules".

## Firebase (Auth + Firestore)

L'app si appoggia a Firebase Auth + Firestore per login e sincronizzazione del progresso tra dispositivi. La configurazione lato console e' una-tantum, lato codice tutto e' gia' cablato.

### Setup console (una sola volta, manuale)

1. **Crea progetto** su [console.firebase.google.com](https://console.firebase.google.com): nome `guess-the-char` (o quello che preferisci), disabilita Google Analytics.
2. **Aggiungi web app** (icona `</>`): nickname libero, **non** abilitare Hosting (siamo su Pages). Ti restituisce un config object con 6 stringhe (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
3. **Incolla il config** in `src/app/core/firebase/firebase.config.ts` al posto dei placeholder. E aggiorna `.firebaserc` mettendo il `projectId` reale al posto di `PLACEHOLDER_PROJECT_ID`.
4. **Restringi la apiKey** (importante per non farsi rubare quota): su [console.cloud.google.com](https://console.cloud.google.com) -> APIs & Services -> Credentials -> click sulla "Browser key (auto created by Firebase)" -> Application restrictions = "HTTP referrers", aggiungi `localhost:4200/*` e `alessiopesit-boop.github.io/*`.
5. **Auth providers**: Firebase Console -> Authentication -> Sign-in method, abilita Email/Password e Google (per Apple serve un Apple Developer a $99/anno, salta finche' non serve davvero).
6. **Firestore**: Firebase Console -> Firestore Database -> Create database -> **Production mode** (non test, le test rules scadono). Regione: `eur3` per latenze migliori da IT.
7. **Deploy delle rules**: dalla root del repo, `npx firebase login` (una sola volta), poi `npm run deploy:rules`. Pubblica `firestore.rules` sul tuo progetto. Da ripetere ogni volta che le rules cambiano.

### Codice

- `src/app/core/firebase/firebase.config.ts`: oggetto config pubblico (committato come placeholder, da riempire).
- `src/app/core/firebase/firebase.ts`: `ensureFirebaseApp()` inizializza l'app idempotente; ritorna `null` se config = PLACEHOLDER (modalita' offline-only).
- `src/app/core/firebase/auth.service.ts`: `AuthService` con signal `user` (`User | null | 'loading'`), `enabled` (boolean), metodi `signInEmail/signUpEmail/signInGoogle/signOut`. Quando `enabled === false` i metodi rigettano con `AuthDisabledError`.
- `src/app/core/firebase/user-doc.service.ts`: `UserDocService` che sincronizza lo stato di gioco con `/users/{uid}` su Firestore quando l'utente e' loggato. Bootstrap-attivato (inject dummy in `App`). All'auth.user che diventa autenticato fa max-merge tra locale e cloud; al primo signup chiama `NicknameService.findAvailable` per claimare un nickname unico. Ad ogni cambio di state mentre loggato, push debounced di 1s. Usa `firebase/firestore/lite` (no real-time, no offline persistence) per tenere il bundle sotto i 500kB.
- `src/app/core/firebase/nickname.service.ts`: `NicknameService` gestisce la collezione `/nicknames/{nick_lowercased}` per garantire l'unicita' del nickname. Metodi: `claim(nick, uid)` atomica via runTransaction, `change(oldNick, newNick, uid)` swap atomico (release vecchio + claim nuovo + update `/users/{uid}.nickname` in una sola transazione), `findAvailable(seed, uid)` cerca varianti seed/seed2/seed3/.../seed-rnd, `getUserByNickname(nick)` per il profilo pubblico.
- `AppStateService` si abbona al signal `auth.user` via `effect`: a ogni cambio di stato Auth, riflette in `state.account` (uid, email, nickname seedato da `displayName` per Google, avatar 0 di default).
- `firestore.rules`, `firebase.json`, `.firebaserc` alla root: config per `firebase deploy`. Schema corrente: `/users/{uid}` (stato gioco + anagrafica) e `/nicknames/{nick}` (indice unicita', non ancora popolato).

### Cosa viene sincronizzato in cloud

Quando l'utente e' loggato, `/users/{uid}` ospita:
- `nickname`, `avatar`, `email`, `provider`, `joinedAt`, `updatedAt`
- Contatori cumulativi: `streak`, `bestStreak`, `played`, `correctAnswers`, `accuracy`
- `perScript: {[scriptId]: {tries, correct}}` (max-merge per scrittura tra device)
- Sfida giornaliera: `dailyDone`, `dailyDoneStamp`, `dailyScore`, `dailyStreak`, `dailyHistory[]`

NON sincronizzato (resta per device in `localStorage`): tutte le preferenze UI (`accent`, `motion`, `colorblind`, `sound`, `haptics`, `showCodepoint`), la selezione delle scritture (`selected`), e i flag di sessione (`hintsLeft`, `shownFirstWrong`, `onboarded`). Idea: ti ritrovi i progressi su un altro telefono, ma puoi avere un tema diverso senza che si propaghi.

### Conflict resolution

Al login iniziale, `UserDocService` legge il doc cloud e fa **max-merge** per i contatori cumulativi: cosi' se hai giocato su due device offline, accumuli i progressi su entrambi senza perderli. Per la giornaliera vince lo stamp piu' recente; `dailyHistory` viene unita per `day` (preferisce score piu' alto). Per `nickname`/`avatar` vince il cloud (sono scelte esplicite dell'utente).

Le scritture successive durante la sessione fanno **full overwrite** del documento (con `setDoc({merge: true})` ma a livello field-shallow), perche' dopo il merge iniziale lo stato locale e' la fonte di verita' fino al prossimo login.

### Cosa NON e' ancora collegato

- La route `/leaderboard` e' ancora `ComingSoon`. La PR che la accendera' usera' gia' lo stato Auth (`AuthService.user()`) come fonte di verita' e i progressi cloud da `/users/{uid}`.
- `/profile` reale: hero con avatar editabile in modale (12 glifi predefiniti in `AVATARS`), nickname inline edit (Enter salva, Esc annulla, errore "gia' preso" via transazione `NicknameService.change`), stats 2x2, lista per-scrittura con barre colorate (verde >=75%, ambra >=40%, rosso <40%), badges teaser, storico daily.
- `/u/:nickname` profilo pubblico reale: faux URL bar in cima, avatar 96px, "Membro da MMMM YYYY", stats 2x2 (best, accuracy, played, dailyStreak), griglia 4-col dei badge sbloccati. CTA in fondo cambia in base a "tu / altri": se sei tu mostra "Condividi profilo", altrimenti "Vuoi battere X? Gioca anche tu". Read pubblica via `NicknameService.getUserByNickname` (no auth richiesta, le regole Firestore permettono read pubblica su `/users` e `/nicknames`).

### Convenzioni

- **Niente segreti committati**: il config Firebase NON e' un segreto, vive in chiaro. Le credenziali Apple Sign-In (quando arriveranno) e qualunque service account JSON vanno in `.gitignore`.
- **Provider IDs Firebase**: `password` / `google.com` / `apple.com`. Mappati 1:1 nel campo `AccountInfo.provider`. `'demo'` resta come back-compat per chi aveva il vecchio mock; verra' rimosso quando la 1.3.x avra' circolato.
- **localhost vs prod**: lo stesso progetto Firebase serve dev e prod. Va bene per la nostra scala. Se in futuro vuoi separare, crea un secondo progetto e fai fileReplacement su `firebase.config.ts` come gia' facciamo con `build-info.ts`.

## Vincoli e cose da non fare

- **Non** introdurre RxJS observable per stato applicativo: usa signal/effect. RxJS resta ammesso solo dove serve a integrare API Angular che lo richiedono (es. `toSignal` su params di `Router`).
- **Non** rimuovere lo script SPA-fallback in `src/index.html` ne' lo script di `public/404.html` senza aver configurato un'alternativa al routing path-location: rompe il refresh diretto su route diverse da `/`.
- **Non** bypassare `AppStateService` con scritture dirette a `localStorage`: la chiave `gtc.state` ha uno schema mergiato col `DEFAULT_STATE` ed evita di rompere lo stato di utenti gia' utilizzatori.
- **Non** introdurre librerie UI esterne (Material, PrimeNG, Tailwind) senza necessita': il design system del prototipo e' gia' coerente e pesato.
- **Non** convertire a SCSS o CSS modules per componente senza un buon motivo: lo styling globale e' una scelta, non un'omissione.
- **Non** rimuovere `.nojekyll` o cambiare il `base-href` in `deploy.yml` senza aggiornare entrambi insieme.
- **Non** committare `dist/`, `node_modules/`, `.angular/cache`, ne' file con segreti, ne' `build-sha.local.ts` (gia' in `.gitignore`).

## Quando aggiungi una pagina nuova

1. Crea `src/app/features/<nome>/<nome>.ts` (+ `<nome>.html`, `<nome>.css` opzionali) come standalone component, `OnPush`, selettore `app-<nome>` o simile, classe `export class <Nome>`.
2. Aggiungi la route in `src/app/app.routes.ts` con `loadComponent` e (quasi sempre) `canActivate: [onboardedGuard]`. Se la pagina deve essere accessibile anche senza onboarding (es. `/login`), lascia il guard fuori.
3. Se serve un link di navigazione dalla home o da un'altra schermata, aggiorna il componente che lo deve esporre.
4. Se ci sono stringhe nuove rivolte all'utente, aggiungi la chiave a `STRINGS_IT` e la traduzione in `STRINGS_EN` in `core/i18n/strings.ts` (sono fortemente tipate, TypeScript ti aiuta).
5. **Aggiorna questo file** se la pagina introduce un nuovo concetto (categoria di pagina, dipendenza, pattern).

## Note operative per l'assistente

- Quando ti viene chiesto di "fare X" rispondi in italiano (il proprietario lavora in italiano).
- Niente em-dash (`—`) e niente freccia (`→`) nei file di questo repo, ne' nei messaggi: usa virgole, due punti, parentesi, o parole ("a", "verso", "diventa").
- Prima di marcare un task come finito, lancia `npm run build` (o almeno `npm start` e controlla console) per essere sicuro che compili.
