# Release su Google Play (TWA)

Guida operativa per portare "Indovina il carattere" su Google Play come app Android. Il lavoro nel codice e' fatto: manifest PWA, service worker, config Bubblewrap (`twa-manifest.json`), Digital Asset Links scaffolding (`public/.well-known/assetlinks.json`), workflow CI (`.github/workflows/play-release.yml`). Quello che segue sono le **azioni manuali** che richiedono account/credenziali tuoi, non delegabili a un commit.

Tempo stimato la prima volta: **2-3 ore** (di cui ~1h di attesa per la review Google).

---

## 1. Google Play Developer account ($25 una tantum)

1. Vai su https://play.google.com/console/signup con un account Google personale (non aziendale, se l'idea e' che sia una tua app).
2. Profilo "Developer" (non "Organization"): identita' verificata via documento ID (richiede una foto-id da smartphone, ~10 minuti).
3. Paga i $25. E' la fee una-tantum standard.

Da questo momento hai accesso alla Play Console.

## 2. Genera la keystore di produzione (una sola volta nella vita dell'app)

Da terminale, nella root del repo (la keystore **non** verra' committata, e' coperta da `.gitignore`):

```bash
keytool -genkey -v \
  -keystore android-release.keystore \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 36500 \
  -storepass "$(read -s -p 'Keystore password: ' p && echo $p)" \
  -keypass "$(read -s -p 'Key password (puoi usare la stessa): ' p && echo $p)"
```

`keytool` ti chiedera' alcuni dati (nome, OU, ecc.): possono essere quelli che vuoi, l'importante e' coerenza interna. **Annota da qualche parte le due password**, le rimetterai sui Secrets di GitHub e non le potrai piu' recuperare.

Validity 36500 = 100 anni: la keystore deve sopravvivere a tutti gli update dell'app, perche' Play rifiuta un AAB firmato con una keystore diversa da quella dell'upload iniziale.

> **CONSERVA `android-release.keystore` IN UN POSTO SICURO** (password manager con file vault, NAS criptato, ecc.). Perderla = perdere la possibilita' di aggiornare l'app per sempre.

## 3. Estrai il fingerprint SHA-256 della keystore

```bash
keytool -list -v -keystore android-release.keystore -alias android \
  | grep -E "SHA-256|SHA256"
```

Output simile a:

```
   SHA-256: 1A:2B:3C:4D:5E:6F:...:99
```

**Copia tutta la stringa** (i due punti inclusi). Aggiorna `public/.well-known/assetlinks.json` sostituendo `PLACEHOLDER_REPLACE_WITH_SHA256_FROM_YOUR_RELEASE_KEYSTORE` con il valore reale, poi committa in una PR `chore(android): aggiungi fingerprint SHA-256 della keystore`.

## 4. Service account Google per l'upload via API

Serve perche' il workflow CI carichi l'AAB sulla Play Console senza un click umano.

1. Vai su https://console.cloud.google.com/iam-admin/serviceaccounts.
2. **Seleziona il progetto associato alla tua Play Console** (se non c'e', creane uno; e' un progetto "vuoto" che serve solo per il service account).
3. "Crea service account": nome libero (es. `play-store-uploader`), ruolo "Service Account User" (basta).
4. Apri il service account creato > "Chiavi" > "Aggiungi chiave" > "Crea nuova chiave" > "JSON". Si scarica un file `*.json`. **Conservalo come un segreto** (non committarlo).
5. Vai su https://play.google.com/console > Setup > API access > **Link** il progetto Cloud del passo precedente.
6. Trova il service account nella lista e clicca "Grant access" > permessi minimi: "Release manager" sulla tua app specifica (dopo averla creata, vedi passo 5).

## 5. Crea l'app sulla Play Console

1. Play Console > "Create app".
2. Nome: "Indovina il carattere".
3. Lingua predefinita: Italiano (Italia).
4. Tipo: "App" (non "Game"; piu' semplice come categoria iniziale).
5. Free.
6. Accetta le dichiarazioni standard.

Devi compilare prima del primo upload (Play te lo blocca):

- **Privacy policy** (URL, vedi sotto)
- **App access**: se le funzioni di login richiedono credenziali per i tester, fornisci un account di test
- **Ads**: no, l'app non contiene pubblicita'
- **Content rating**: questionario (~5 minuti)
- **Target audience**: 13+ verosimilmente
- **News app**: no
- **Data safety form**: dichiara raccolta email + nickname + progressi di gioco via Firebase Auth + Firestore

### Privacy policy (URL pubblico richiesto)

Opzioni dal piu' veloce al piu' professionale:
- **Privacy Policy Generator** (https://www.termsfeed.com/privacy-policy-generator/): 10 minuti, output gratuito. Adatto per app non-commerciali.
- Ospitala su una sotto-pagina del sito: aggiungi `public/privacy.html` (o una route Angular `/privacy`), committa, viene servita su `alessiopesit-boop.github.io/guess-the-char/privacy.html`.

## 6. Carica i Secrets su GitHub

Repo > Settings > Secrets and variables > Actions > "New repository secret". Crea questi quattro:

| Secret | Valore |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | output di `base64 -w0 android-release.keystore` (solo la base64, una riga unica) |
| `ANDROID_KEYSTORE_PASSWORD` | la prima password del passo 2 (storepass) |
| `ANDROID_KEY_PASSWORD` | la seconda password del passo 2 (keypass) |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | il contenuto **completo** del JSON scaricato al passo 4 |

Comandi pratici per la base64:

```bash
base64 -w0 android-release.keystore | xclip -selection clipboard   # Linux
base64 android-release.keystore | pbcopy                            # macOS
```

Poi incolla nella casella del secret.

## 7. Primo upload manuale (una sola volta)

Il workflow automatico funziona solo dopo che la Play Console conosce **almeno una** versione dell'app sulla track "Internal testing". Il primo upload va fatto a mano.

1. Lancia il workflow manualmente: vai su GitHub > Actions > "Release to Google Play" > "Run workflow" > track: `internal`. Genera comunque un AAB e prova a uploadare. Se la Play Console rifiuta perche' "no existing release", scarica l'AAB dall'artifact del workflow ("app-release-bundle") e uploadlo manualmente in Play Console > Internal testing > "Create new release".
2. Compila note di rilascio in italiano + inglese (massimo 500 caratteri per lingua).
3. Submit per review. Internal testing si attiva quasi subito (~minuti). Per uscire da Internal e passare a Production servono giorni e una review formale.

Dopo questa volta, ogni `release.published` su GitHub triggera automaticamente un nuovo build + upload, e l'AAB compare in Internal testing senza interventi.

## 8. Asset Links: verifica che funzionino

Dopo che `public/.well-known/assetlinks.json` e' aggiornato con il fingerprint reale e deployato su Pages, verifica:

```
https://alessiopesit-boop.github.io/.well-known/assetlinks.json
```

**Attenzione**: GitHub Pages serve gli asset di un repo sotto `/<repo-name>/`, ma Asset Links DEVE essere alla **root del dominio**. Quindi la URL canonica per il browser Chrome / Play Store e':

```
https://alessiopesit-boop.github.io/.well-known/assetlinks.json
```

Questo richiede che il file vada servito dal **profilo GitHub Pages** (`alessiopesit-boop.github.io` repo), non dal repo `guess-the-char`. Hai due opzioni:

- **Opzione A** (consigliata): crea un repo `alessiopesit-boop.github.io` (o se esiste, aggiungi `.well-known/assetlinks.json` li' dentro). E' il repo profilo, viene servito a root del dominio.
- **Opzione B**: usa un dominio custom per `guess-the-char` (es. `indovinailcarattere.it`) e li' il file `/.well-known/assetlinks.json` lo serviamo gia' noi tramite questo repo. Aggiungere costo (~10 EUR/anno per il dominio) e setup DNS extra.

Verifica con il validator ufficiale Google:
```
https://developers.google.com/digital-asset-links/tools/generator
```

Se il file e' al posto giusto e contiene il fingerprint corretto, lo strumento ti dara' "Statement is valid".

Senza Asset Links validi, l'app TWA si apre comunque su Android **ma** mostra la barra del browser ("App apre alessiopesit-boop.github.io"), tradendo che e' un wrapper. Con Asset Links validi, l'app si apre full-screen come un'app nativa.

## 9. Update successivi: tutto automatico

Da qui in avanti:

1. Mergi feature/fix su `main` come al solito.
2. Mergi la Release PR di release-please quando vuoi rilasciare.
3. Si tagga `vX.Y.Z`, parte:
   - `deploy.yml`: pubblica il sito su GitHub Pages (pre-prod)
   - `play-release.yml`: builda l'AAB e lo carica su Play Store track `internal`
4. Apri la Play Console e fai "Promote release" da Internal a Production quando vuoi che la nuova versione raggiunga tutti.

`appVersionCode` viene calcolato dal tag con la formula `MAJOR*10000 + MINOR*100 + PATCH` (es. 1.6.0 -> 10600). Funziona finche' nessuna componente supera 99: a quel punto andra' aggiornata.

## Troubleshooting

- **`Keystore was tampered with, or password was incorrect`**: la `ANDROID_KEYSTORE_PASSWORD` o `ANDROID_KEY_PASSWORD` su Secrets non combaciano con quelle reali. Rifai dal passo 2 generando una **nuova** keystore solo se sei alla primissima pubblicazione; altrimenti recupera le password dal tuo password manager.
- **`Package not found` su upload**: l'app non esiste ancora sulla Play Console (vedi passo 5).
- **`No existing release` al primo dispatch**: il primo upload Play va fatto manualmente (vedi passo 7). Dopo, automatico.
- **Asset Links validator dice "Statement not found"**: il file `assetlinks.json` non e' alla root del dominio. Vedi passo 8 (Opzione A o B).
- **L'app TWA su Android mostra la barra del browser sopra**: Asset Links non valido, oppure cache vecchia sul telefono. Disinstalla l'app, riavvia, reinstalla dalla Play Console.
