# Release to Google Play (TWA)

Operational guide to ship "Guess the Char" to Google Play as an Android app. The work in the code is already done: PWA manifest, service worker, Bubblewrap config (`twa-manifest.json`), Digital Asset Links scaffolding (`public/.well-known/assetlinks.json`), CI workflow (`.github/workflows/play-release.yml`). What follows are the **manual actions** that require accounts and credentials only you have, so they cannot be delegated to a commit.

First-time estimate: **2-3 hours** (of which ~1h is waiting for Google review).

---

## 1. Google Play Developer account ($25 one-time)

1. Go to https://play.google.com/console/signup with a personal Google account (not a corporate one, if the idea is that this is your app).
2. "Developer" profile (not "Organization"): identity verified by ID document (requires a photo-ID from a smartphone, ~10 minutes).
3. Pay the $25. This is the standard one-time fee.

From this moment you have access to the Play Console.

## 2. Generate the production keystore (once in the lifetime of the app)

From a terminal, in the repo root (the keystore will **not** be committed, it is covered by `.gitignore`):

```bash
keytool -genkey -v \
  -keystore android-release.keystore \
  -alias android \
  -keyalg RSA -keysize 2048 -validity 36500 \
  -storepass "$(read -s -p 'Keystore password: ' p && echo $p)" \
  -keypass "$(read -s -p 'Key password (you can use the same): ' p && echo $p)"
```

`keytool` will ask for some info (name, OU, etc.): values can be whatever you want, what matters is internal consistency. **Write the two passwords down somewhere safe**: you will put them as GitHub Secrets, and you will not be able to recover them later.

Validity 36500 = 100 years: the keystore must survive every app update, because Play refuses an AAB signed with a keystore different from the one of the initial upload.

> **KEEP `android-release.keystore` IN A SAFE PLACE** (password manager with a file vault, encrypted NAS, etc.). Losing it = losing the ability to ever update the app again.

## 3. Extract the SHA-256 fingerprint of the keystore

```bash
keytool -list -v -keystore android-release.keystore -alias android \
  | grep -E "SHA-256|SHA256"
```

Output looks like:

```
   SHA-256: 1A:2B:3C:4D:5E:6F:...:99
```

**Copy the entire string** (colons included). Update `public/.well-known/assetlinks.json` replacing `PLACEHOLDER_REPLACE_WITH_SHA256_FROM_YOUR_RELEASE_KEYSTORE` with the real value, then commit it as a PR `chore(android): add keystore SHA-256 fingerprint`.

## 4. Google service account for upload via API

Needed so the CI workflow can push the AAB to Play Console without a human click.

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts.
2. **Select the project linked to your Play Console** (if it does not exist, create one; it is an "empty" project that only exists to host the service account).
3. "Create service account": any name (e.g. `play-store-uploader`), role "Service Account User" (enough).
4. Open the new service account > "Keys" > "Add key" > "Create new key" > "JSON". A `*.json` file is downloaded. **Keep it as a secret** (do not commit it).
5. Go to https://play.google.com/console > Setup > API access > **Link** the Cloud project from the previous step.
6. Find the service account in the list and click "Grant access" > minimum permissions: "Release manager" on your specific app (after you create it, see step 5).

## 5. Create the app in Play Console

1. Play Console > "Create app".
2. Name: "Guess the Char".
3. Default language: English (United States).
4. Type: "App" (not "Game"; simpler as an initial category).
5. Free.
6. Accept the standard declarations.

You must fill in before the first upload (Play blocks you otherwise):

- **Privacy policy** (URL, see below)
- **App access**: if login features require credentials for testers, provide a test account
- **Ads**: no, the app contains no advertising
- **Content rating**: questionnaire (~5 minutes)
- **Target audience**: 13+ likely
- **News app**: no
- **Data safety form**: declare collection of email + nickname + game progress via Firebase Auth + Firestore

Add Italian as a translation under "Store listing > Manage translations" so users with an Italian device see the Italian title/description while the rest of the world sees the English ones.

### Privacy policy (public URL required)

Options from fastest to most professional:
- **Privacy Policy Generator** (https://www.termsfeed.com/privacy-policy-generator/): 10 minutes, free output. Suitable for non-commercial apps.
- Host it on a sub-page of the site: add `public/privacy.html` (or an Angular route `/privacy`), commit, it is served at `alessiopesit-boop.github.io/guess-the-char/privacy.html`.

## 6. Upload the Secrets to GitHub

Repo > Settings > Secrets and variables > Actions > "New repository secret". Create these four:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 android-release.keystore` (only the base64, one single line) |
| `ANDROID_KEYSTORE_PASSWORD` | the first password from step 2 (storepass) |
| `ANDROID_KEY_PASSWORD` | the second password from step 2 (keypass) |
| `PLAY_STORE_SERVICE_ACCOUNT_JSON` | the **full** contents of the JSON downloaded at step 4 |

Practical commands for base64:

```bash
base64 -w0 android-release.keystore | xclip -selection clipboard   # Linux
base64 android-release.keystore | pbcopy                            # macOS
```

Then paste into the secret box.

## 7. First manual upload (one time only)

The automatic workflow only works after Play Console knows **at least one** version of the app on the "Internal testing" track. The first upload must be done by hand.

1. Trigger the workflow manually: go to GitHub > Actions > "Release to Google Play" > "Run workflow" > track: `internal`. It will still build an AAB and attempt to upload. If Play Console rejects it because of "no existing release", download the AAB from the workflow artifact ("app-release-bundle") and upload it manually via Play Console > Internal testing > "Create new release".
2. Fill in release notes in English + Italian (max 500 characters per language).
3. Submit for review. Internal testing activates almost immediately (~minutes). To leave Internal and reach Production takes days and a formal review.

After this time, every `release.published` event on GitHub will automatically trigger a new build + upload, and the AAB will show up on Internal testing without manual steps.

## 8. Asset Links: verify they work

After `public/.well-known/assetlinks.json` is updated with the real fingerprint and deployed to Pages, check:

```
https://alessiopesit-boop.github.io/.well-known/assetlinks.json
```

**Warning**: GitHub Pages serves the assets of a repo under `/<repo-name>/`, but Asset Links MUST live at the **domain root**. So the canonical URL for the Chrome browser / Play Store is:

```
https://alessiopesit-boop.github.io/.well-known/assetlinks.json
```

This requires the file to be served from the **GitHub profile Pages** (the `alessiopesit-boop.github.io` repo), not from the `guess-the-char` repo. You have two options:

- **Option A** (recommended): create a `alessiopesit-boop.github.io` repo (or, if it exists, add `.well-known/assetlinks.json` inside it). It is the profile repo, served at the root of the domain.
- **Option B**: use a custom domain for `guess-the-char` (e.g. `guessthechar.com`) and there `/.well-known/assetlinks.json` is served by this repo. Adds a cost (~10 EUR/year for the domain) and extra DNS setup.

Verify with Google's official validator:
```
https://developers.google.com/digital-asset-links/tools/generator
```

If the file is in the right place and contains the right fingerprint, the tool will say "Statement is valid".

Without valid Asset Links, the TWA app still opens on Android **but** displays the browser bar ("App opens alessiopesit-boop.github.io"), revealing that it is a wrapper. With valid Asset Links the app opens full-screen as a native app.

## 9. Future updates: fully automatic

From here on:

1. Merge feature/fix PRs into `main` as usual.
2. Merge release-please's Release PR whenever you want to ship.
3. The `vX.Y.Z` tag is created, then in parallel:
   - `deploy.yml`: publishes the site to GitHub Pages (pre-prod)
   - `play-release.yml`: builds the AAB and uploads it to Play Store track `internal`
4. Open Play Console and "Promote release" from Internal to Production when you want the new version to reach everyone.

`appVersionCode` is computed from the tag with the formula `MAJOR*10000 + MINOR*100 + PATCH` (e.g. 1.6.0 becomes 10600). Works as long as no component exceeds 99: at that point it will need to be updated.

## Troubleshooting

- **`Keystore was tampered with, or password was incorrect`**: `ANDROID_KEYSTORE_PASSWORD` or `ANDROID_KEY_PASSWORD` on Secrets does not match the real ones. Redo from step 2 generating a **new** keystore only if this is the very first publication; otherwise recover the passwords from your password manager.
- **`Package not found` on upload**: the app does not yet exist in Play Console (see step 5).
- **`No existing release` on first dispatch**: the first Play upload must be manual (see step 7). After that, automatic.
- **Asset Links validator says "Statement not found"**: the `assetlinks.json` file is not at the domain root. See step 8 (Option A or B).
- **The TWA app on Android shows the browser bar at the top**: Asset Links is invalid, or an old cache on the phone. Uninstall the app, reboot, reinstall from Play Console.
