# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate qui.

Il formato si basa su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/),
e il progetto segue il [Semantic Versioning](https://semver.org/lang/it/).

## [1.0.0](https://github.com/alessiopesit-boop/guess-the-char/compare/v0.2.0...v1.0.0) (2026-05-22)


### ⚠ BREAKING CHANGES

* migrare ad Angular con nuovo design ([#13](https://github.com/alessiopesit-boop/guess-the-char/issues/13))

### Features

* aggiungi scritture indiane ([b256a85](https://github.com/alessiopesit-boop/guess-the-char/commit/b256a8591e59f32e1c5ead643c38641552956481)), closes [#5](https://github.com/alessiopesit-boop/guess-the-char/issues/5)
* aggiungi scritture mediorientali ([74770d4](https://github.com/alessiopesit-boop/guess-the-char/commit/74770d41e6ad3701decbce619a777b959529e7c0)), closes [#6](https://github.com/alessiopesit-boop/guess-the-char/issues/6)
* aggiungi scritture sud-est asiatico ([f5816bb](https://github.com/alessiopesit-boop/guess-the-char/commit/f5816bb621e5631bd9e47af3507c4ed551b0ae0d)), closes [#4](https://github.com/alessiopesit-boop/guess-the-char/issues/4)
* espandi dataset CJK a 449 caratteri ([e6aa29b](https://github.com/alessiopesit-boop/guess-the-char/commit/e6aa29bec012b7dded918e22e9a16c0358859888)), closes [#3](https://github.com/alessiopesit-boop/guess-the-char/issues/3)
* migrare ad Angular con nuovo design ([#13](https://github.com/alessiopesit-boop/guess-the-char/issues/13)) ([50deb7d](https://github.com/alessiopesit-boop/guess-the-char/commit/50deb7dd3a47bdda8eefb2f9b73f24f4bce581cc))
* rebrand a Guess the Char ([6673b8b](https://github.com/alessiopesit-boop/guess-the-char/commit/6673b8bad78dda23323575be79db84d612b4068d)), closes [#10](https://github.com/alessiopesit-boop/guess-the-char/issues/10)
* UI a famiglie con accordion ibrido ([7decc8c](https://github.com/alessiopesit-boop/guess-the-char/commit/7decc8cf71c8e218a0594fdfe9a8fe5e82a51ae5)), closes [#7](https://github.com/alessiopesit-boop/guess-the-char/issues/7)

## [Unreleased]

### Modificato
- Refactor dataset: struttura a famiglie di scritture con label localizzate inline e caratteri come oggetti estensibili (#2)
- UI selezione scritture: accordion a famiglie con toggle individuale e di gruppo (#7)
- Opzioni risposta limitate a max 4 per giocabilità con molte scritture (#7)
- Rebrand a "Guess the Char" con scope esteso a tutte le scritture del mondo (#8)
- Aggiornati metadati SEO, Open Graph, Twitter Card (#8)
- README riscritto (#8)

### Aggiunto
- Dataset CJK espanso da 69 a 449 caratteri (#3)
- Scritture sud-est asiatiche: Thai, Khmer, Birmano (175 caratteri totali, #4)
- Scritture indiane: Devanagari, Tamil, Bengalese (152 caratteri totali, #5)
- Scritture mediorientali: Arabo, Ebraico (63 caratteri totali, #6)


## [0.2.0] - 2026-04-23
### Aggiunto
- Menu lingua UI (italiano/inglese) con bandiere
- Sottotitolo SEO che spiega l'acronimo CJK
- Pulsante reset del punteggio
- Percentuale di successo nel counter
- Link "Scopri il carattere" a Wiktionary (localizzato IT/EN)
- Metadata SEO: Open Graph, Twitter Card, description, keywords

### Modificato
- Dark mode con palette fissa
- Titolo in peso thin (200)
- Spaziatura generale aumentata

### Rimosso
- Sezione hint/wiki che appariva dopo la risposta

## [0.1.0] - 2026-04-23
### Aggiunto
- Quiz iniziale per riconoscere caratteri CJK
- Supporto per cinese, giapponese, coreano
- Toggle per attivare/disattivare le lingue
