import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { AuthService } from '../../core/firebase/auth.service';
import { NicknameService } from '../../core/firebase/nickname.service';
import {
  ChallengeDoc,
  ChallengeQuestion,
  ChallengesService,
} from '../../core/firebase/challenges.service';
import { scriptById } from '../../core/data/scripts';
import { AppBar } from '../../shared/app-bar';
import { SoundService } from '../../core/audio/sound.service';

type Mode = 'create' | 'reply';
type Phase = 'intro' | 'playing' | 'feedback' | 'finished';

/**
 * Componente unico per giocare una sfida custom tra amici.
 *
 * Due modalita':
 *  - 'create' (rotta /sfida/nuova/:toNickname): sei il challenger. Genero al
 *    volo 5 domande, le giochi tu per primo; al termine vedi il tuo score e
 *    confermi l'invio della sfida (creo il doc Firestore).
 *  - 'reply' (rotta /sfida/:id): sei il destinatario. Carico la sfida, giochi
 *    le stesse 5 domande che il challenger aveva generato; al termine salvo
 *    toScore e mostro il confronto.
 *
 * Se entri in /sfida/:id e la challenge e' gia' completata o l'avevi creata
 * tu stesso, salto il gioco e mostro direttamente il risultato (read-only).
 */
@Component({
  selector: 'app-challenge-play',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './challenge-play.html',
  styleUrl: './challenge-play.css',
})
export class ChallengePlay {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly auth = inject(AuthService);
  private readonly nicknameSvc = inject(NicknameService);
  private readonly challenges = inject(ChallengesService);
  private readonly sound = inject(SoundService);

  // Tipizzazione del param map: nuova/:toNickname (mode create) vs :id (mode reply)
  private readonly params = toSignal(this.route.paramMap, { initialValue: null });

  protected readonly mode = computed<Mode>(() => {
    const p = this.params();
    if (!p) return 'reply';
    if (p.has('toNickname')) return 'create';
    return 'reply';
  });

  protected readonly toNickname = computed<string>(() => {
    return this.params()?.get('toNickname') ?? '';
  });

  protected readonly challengeId = computed<string>(() => {
    return this.params()?.get('id') ?? '';
  });

  /** Stato della sfida caricato da Firestore (solo mode 'reply'). */
  protected readonly challenge = signal<ChallengeDoc | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  /** 5 domande pre-generate (mode 'create') o lette dal doc (mode 'reply'). */
  protected readonly questions = signal<ChallengeQuestion[]>([]);

  /** Indice domanda corrente (0..4) e fase. */
  protected readonly idx = signal(0);
  protected readonly phase = signal<Phase>('intro');

  /** Risposte gia' date: array di bool con length === idx (history). */
  protected readonly answers = signal<boolean[]>([]);

  /** Ultima scelta nella fase 'feedback'. */
  protected readonly chosen = signal<{ id: string; correct: boolean } | null>(null);

  /** Stato submit (per disabilitare bottoni). */
  protected readonly submitting = signal(false);

  /** Risultato finale + flag se sfida gia' completata in passato. */
  protected readonly readOnly = signal(false);

  /** uid utente loggato. */
  protected readonly myUid = computed(() => {
    const u = this.auth.user();
    return u && u !== 'loading' ? u.uid : null;
  });

  // Score derivati dall'array answers.
  protected readonly myScore = computed(() => this.answers().filter(Boolean).length);
  protected readonly totalQ = computed(() => this.questions().length);

  /** Avvia il caricamento o il setup non appena conosciamo la modalita'. */
  private readonly _bootstrap = effect(() => {
    const m = this.mode();
    const p = this.params();
    if (!p) return;
    if (m === 'create') {
      this.setupCreate();
    } else {
      const id = this.challengeId();
      if (id) void this.loadReply(id);
    }
  });

  /** Inizializzazione in modalita' create: genera 5 domande locali. */
  private setupCreate(): void {
    if (this.questions().length > 0) return;
    const qs = this.challenges.newQuestionSet();
    this.questions.set(qs);
  }

  /** Carica la sfida esistente per il destinatario. */
  private async loadReply(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const c = await this.challenges.getById(id);
      if (!c) {
        this.errorMsg.set(
          this.i18n.lang() === 'it'
            ? 'Sfida non trovata.'
            : 'Challenge not found.',
        );
        return;
      }
      this.challenge.set(c);
      this.questions.set(c.questions ?? []);
      // Se gia' completata, vai dritto al risultato in modalita' read-only.
      if (c.status === 'completed') {
        this.readOnly.set(true);
        this.phase.set('finished');
        if (this.myUid() === c.to && typeof c.toScore === 'number') {
          this.answers.set(this.toAnswersFromScore(c.toScore, c.questions.length));
        }
        return;
      }
      // Se sono io il creatore della sfida e sto entrando in /sfida/:id,
      // sono in attesa che l'altro giochi: mostro stato "in attesa".
      if (this.myUid() === c.from) {
        this.readOnly.set(true);
        this.phase.set('finished');
      }
    } finally {
      this.loading.set(false);
    }
  }

  /** Helper: ricostruisce un array boolean[length] tale per cui filter(Boolean) == score.
   *  Usato solo per visualizzare lo score del destinatario nel risultato, non
   *  serve granularita' della singola risposta. */
  private toAnswersFromScore(score: number, length: number): boolean[] {
    const out: boolean[] = [];
    for (let i = 0; i < length; i++) out.push(i < score);
    return out;
  }

  /** Inizia a giocare le 5 domande. */
  protected startGame(): void {
    this.phase.set('playing');
  }

  /** Risposta dell'utente: registra l'esito, mostra feedback, avanza. */
  protected pick(optionId: string): void {
    if (this.phase() !== 'playing') return;
    const q = this.questions()[this.idx()];
    if (!q) return;
    const correct = optionId === q.correctId;
    this.chosen.set({ id: optionId, correct });
    this.answers.update((a) => [...a, correct]);
    this.phase.set('feedback');
    if (correct) {
      this.sound.playCorrect();
    } else {
      this.sound.playWrong();
    }
    setTimeout(() => this.nextOrFinish(), 900);
  }

  private nextOrFinish(): void {
    const nextIdx = this.idx() + 1;
    if (nextIdx >= this.totalQ()) {
      this.phase.set('finished');
      return;
    }
    this.idx.set(nextIdx);
    this.chosen.set(null);
    this.phase.set('playing');
  }

  /** Submit finale del creatore: crea la challenge su Firestore. */
  protected async sendChallenge(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    try {
      const targetNick = this.toNickname();
      const targetUser = await this.nicknameSvc.getUserByNickname(targetNick);
      if (!targetUser) {
        this.errorMsg.set(
          this.i18n.lang() === 'it'
            ? `Utente "${targetNick}" non trovato.`
            : `User "${targetNick}" not found.`,
        );
        return;
      }
      const id = await this.challenges.create(
        targetUser.uid,
        targetNick,
        this.myScore(),
        this.questions(),
      );
      // Vai alla lista sfide con flag di successo (router state).
      this.router.navigate(['/sfide'], { state: { justSent: id } });
    } catch (e) {
      console.error('[challenge] sendChallenge error:', e);
      this.errorMsg.set(
        this.i18n.lang() === 'it'
          ? "Errore nell'invio della sfida."
          : 'Error sending the challenge.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /** Submit finale del destinatario: salva toScore. */
  protected async submitReply(): Promise<void> {
    if (this.submitting()) return;
    const c = this.challenge();
    if (!c) return;
    this.submitting.set(true);
    try {
      await this.challenges.submitToScore(c.id, this.myScore());
      // Aggiorno localmente il doc cosi' UI mostra il confronto definitivo.
      this.challenge.set({ ...c, toScore: this.myScore(), status: 'completed' });
    } catch (e) {
      console.error('[challenge] submitReply error:', e);
      this.errorMsg.set(
        this.i18n.lang() === 'it'
          ? 'Errore nel salvataggio del risultato.'
          : 'Error saving the result.',
      );
    } finally {
      this.submitting.set(false);
    }
  }

  /** Nome leggibile per uno script id (es. 'hiragana' -> 'Hiragana'). */
  protected nameOf(scriptId: string): string {
    const s = scriptById(scriptId);
    if (!s) return scriptId;
    return this.i18n.lang() === 'it' ? s.nameIt : s.nameEn;
  }

  /** State per il button .opt (corretto/sbagliato/normale). */
  protected optState(scriptId: string): 'correct' | 'wrong' | null {
    const ch = this.chosen();
    if (!ch) return null;
    const q = this.questions()[this.idx()];
    if (!q) return null;
    if (scriptId === q.correctId) return 'correct';
    if (scriptId === ch.id && !ch.correct) return 'wrong';
    return null;
  }

  /** Verdetto finale per il confronto (mode reply, completed). */
  protected readonly verdict = computed<'win' | 'lose' | 'draw' | null>(() => {
    const c = this.challenge();
    if (!c || typeof c.toScore !== 'number') return null;
    const me = this.myUid();
    if (!me) return null;
    const meScore = me === c.to ? c.toScore : c.fromScore;
    const them = me === c.to ? c.fromScore : c.toScore;
    if (meScore > them) return 'win';
    if (meScore < them) return 'lose';
    return 'draw';
  });

  protected readonly verdictLabel = computed(() => {
    const v = this.verdict();
    const isIt = this.i18n.lang() === 'it';
    if (v === 'win') return isIt ? 'Hai vinto!' : 'You won!';
    if (v === 'lose') return isIt ? 'Hai perso.' : 'You lost.';
    if (v === 'draw') return isIt ? 'Pareggio.' : 'Draw.';
    return '';
  });

  /** Score "tuo" per la schermata finale (utile in mode reply, sia come
   *  destinatario sia come challenger che torna a guardare). */
  protected readonly displayMyScore = computed(() => {
    const c = this.challenge();
    if (!c) return this.myScore();
    const me = this.myUid();
    if (me === c.to && typeof c.toScore === 'number') return c.toScore;
    if (me === c.from) return c.fromScore;
    return this.myScore();
  });

  /** Score "dell'altro" per la schermata finale. */
  protected readonly displayTheirScore = computed(() => {
    const c = this.challenge();
    if (!c) return null;
    const me = this.myUid();
    if (me === c.to) return c.fromScore;
    if (me === c.from) return typeof c.toScore === 'number' ? c.toScore : null;
    return null;
  });

  /** Nickname dell'avversario per i titoli. */
  protected readonly theirNickname = computed(() => {
    const c = this.challenge();
    if (c) {
      const me = this.myUid();
      return me === c.to ? c.fromNickname : c.toNickname;
    }
    return this.toNickname();
  });

  protected goBack(): void {
    this.router.navigate(['/sfide']);
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  protected viewFriendProfile(): void {
    const nick = this.theirNickname();
    if (nick) this.router.navigate(['/u', nick]);
  }
}
