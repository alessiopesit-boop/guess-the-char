import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { ALL_SCRIPT_IDS, ScriptInfo } from '../../core/data/scripts';
import { Question, buildQuestion, mulberry32, seedFromDate } from '../../core/data/quiz';
import { SoundService } from '../../core/audio/sound.service';
import { HapticsService } from '../../core/audio/haptics.service';
import { Icon } from '../../shared/icon';
import { StreakPill } from '../../shared/streak-pill';
import { TimerRing } from '../../shared/timer-ring';
import { Lives } from '../../shared/lives';

export type GameMode = 'training' | 'timed' | 'survival' | 'daily';

export interface HistoryEntry {
  correct: boolean;
  scriptId: string;
  glyph: string;
}

const TIMED_DURATION = 60;
const DAILY_TOTAL = 5;
const SURVIVAL_LIVES = 3;
const COMBO_MAX = 5;

@Component({
  selector: 'app-game',
  imports: [Icon, StreakPill, TimerRing, Lives],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game.html',
  styleUrl: './game.css',
})
export class Game implements OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly sound = inject(SoundService);
  private readonly haptics = inject(HapticsService);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly mode = computed<GameMode>(() => {
    if (this.router.url.startsWith('/daily')) return 'daily';
    const m = this.queryParams().get('mode');
    return m === 'timed' || m === 'survival' || m === 'training' ? m : 'training';
  });
  protected readonly weakOnly = computed(() => this.queryParams().get('weak') === '1');
  protected readonly isTraining = computed(() => this.mode() === 'training');
  protected readonly isTimed = computed(() => this.mode() === 'timed');
  protected readonly isSurvival = computed(() => this.mode() === 'survival');
  protected readonly isDaily = computed(() => this.mode() === 'daily');

  protected readonly state = this.appState.state;

  private readonly effectiveIds = computed<string[]>(() => {
    if (this.isDaily()) return [...ALL_SCRIPT_IDS];
    if (this.weakOnly()) {
      const weak = Object.entries(this.state().perScript ?? {})
        .filter(([, v]) => v.tries >= 3 && v.correct / v.tries < 0.6)
        .map(([id]) => id);
      return weak.length >= 2 ? weak : [...this.state().selected];
    }
    return [...this.state().selected];
  });

  // RNG persistito per la sessione corrente
  private readonly rng = mulberry32(
    this.isDaily() ? seedFromDate() : Math.floor(Math.random() * 1e9),
  );

  protected readonly idx = signal(0);
  protected readonly question = signal<Question | null>(null);
  protected readonly chosen = signal<{ id: string; correct: boolean } | null>(null);
  /** Overlay informativo aperto sopra la partita; non interrompe il gioco. */
  protected readonly infoOverlay = signal<'glyph' | 'script' | null>(null);
  protected readonly lives = signal(SURVIVAL_LIVES);
  protected readonly secondsLeft = signal(TIMED_DURATION);
  protected readonly streakLocal = signal(0);
  protected readonly combo = signal(1);
  protected readonly score = signal(0);
  protected readonly history = signal<HistoryEntry[]>([]);
  protected readonly flash = signal<'correct' | 'wrong' | null>(null);
  protected readonly glyphFx = signal<'correct' | 'wrong' | null>(null);
  protected readonly hintsLeft = signal(this.appState.state().hintsLeft ?? 1);
  protected readonly eliminated = signal<ReadonlyArray<string>>([]);

  protected readonly totalDaily = DAILY_TOTAL;
  protected readonly correctCount = computed(() => this.history().filter((h) => h.correct).length);
  protected readonly totalProgress = computed(() => {
    if (this.isDaily()) return this.idx() / DAILY_TOTAL;
    if (this.isTimed()) return (TIMED_DURATION - this.secondsLeft()) / TIMED_DURATION;
    return Math.min(this.history().length / 20, 1);
  });
  protected readonly showCp = computed(() => this.state().showCodepoint);

  private timerId: ReturnType<typeof setInterval> | null = null;
  private bootstrapped = false;

  constructor() {
    effect(() => {
      // Avvia con la prima domanda quando l'effettivo pool e' pronto
      const ids = this.effectiveIds();
      if (!this.bootstrapped && ids.length >= 2) {
        this.question.set(buildQuestion(this.rng, ids, null));
        this.bootstrapped = true;
      }
    });

    effect(() => {
      if (!this.isTimed()) return;
      if (this.timerId) return;
      this.timerId = setInterval(() => {
        const next = Math.max(0, this.secondsLeft() - 1);
        this.secondsLeft.set(next);
        if (next <= 0) {
          if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
          }
          this.finishSession();
        }
      }, 1000);
    });

    effect(() => {
      if (this.isSurvival() && this.lives() <= 0) {
        setTimeout(() => this.finishSession(), 700);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private advanceQuestion(prevId: string | null): void {
    const q = buildQuestion(this.rng, this.effectiveIds(), prevId);
    this.question.set(q);
    this.chosen.set(null);
    this.glyphFx.set(null);
    this.eliminated.set([]);
  }

  protected useHint(): void {
    if (this.chosen() || this.hintsLeft() <= 0) return;
    const q = this.question();
    if (!q) return;
    this.sound.playTick();
    const wrongs = q.options.filter((o) => o.id !== q.correct.id).map((o) => o.id);
    const elim = wrongs.sort(() => 0.5 - Math.random()).slice(0, 2);
    this.eliminated.set(elim);
    this.hintsLeft.update((n) => n - 1);
  }

  protected pick(opt: ScriptInfo): void {
    if (this.chosen() || this.eliminated().includes(opt.id)) return;
    const q = this.question();
    if (!q) return;
    const correct = opt.id === q.correct.id;
    this.chosen.set({ id: opt.id, correct });
    if (correct) this.sound.playCorrect();
    else this.sound.playWrong();
    this.haptics.vibrate(correct ? 8 : 30);

    if (this.isTimed()) {
      this.flash.set(correct ? 'correct' : 'wrong');
      this.glyphFx.set(correct ? 'correct' : 'wrong');
      setTimeout(() => this.flash.set(null), 400);
      if (correct) {
        const newCombo = Math.min(this.combo() + 1, COMBO_MAX);
        this.score.update((s) => s + 10 * this.combo());
        this.combo.set(newCombo);
      } else {
        this.combo.set(1);
      }
    }

    this.history.update((h) => [
      ...h,
      { correct, scriptId: q.correct.id, glyph: q.glyph },
    ]);
    this.streakLocal.update((s) => (correct ? s + 1 : 0));

    this.appState.patch((prev) => {
      const perScript = { ...prev.perScript };
      const cur = perScript[q.correct.id] ?? { tries: 0, correct: 0 };
      perScript[q.correct.id] = {
        tries: cur.tries + 1,
        correct: cur.correct + (correct ? 1 : 0),
      };
      const newPlayed = prev.played + 1;
      const newCorrect = prev.correctAnswers + (correct ? 1 : 0);
      const newStreak = correct ? prev.streak + 1 : 0;
      return {
        ...prev,
        perScript,
        played: newPlayed,
        correctAnswers: newCorrect,
        accuracy: Math.round((100 * newCorrect) / Math.max(1, newPlayed)),
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
    });

    if (!correct && this.isSurvival()) {
      this.lives.update((l) => l - 1);
    }

    if (this.isTimed()) {
      setTimeout(() => {
        if (this.secondsLeft() > 0) {
          this.idx.update((i) => i + 1);
          this.advanceQuestion(q.correct.id);
        }
      }, 480);
    }
  }

  protected advance(): void {
    const q = this.question();
    const nextIdx = this.idx() + 1;
    if (this.isDaily() && nextIdx >= DAILY_TOTAL) {
      this.finishDaily();
      return;
    }
    if (this.isSurvival() && this.lives() <= 0) {
      this.finishSession();
      return;
    }
    this.idx.set(nextIdx);
    this.advanceQuestion(q?.correct.id ?? null);
  }

  private finishSession(): void {
    this.appState.update({ hintsLeft: 1 });
    this.router.navigate(['/session-result'], {
      queryParams: { mode: this.mode(), score: this.isTimed() ? this.score() : null },
      state: { history: this.history() },
      replaceUrl: true,
    });
  }

  private finishDaily(): void {
    const today = new Date();
    const stamp = today.toDateString();
    const dayLabel =
      String(today.getDate()).padStart(2, '0') + '/' +
      String(today.getMonth() + 1).padStart(2, '0');
    const hist = this.history();
    const correctScore = hist.filter((h) => h.correct).length;

    this.appState.patch((prev) => {
      const last = (prev.dailyHistory ?? []).slice(-1)[0];
      const yest = new Date(today);
      yest.setDate(today.getDate() - 1);
      let newDailyStreak: number;
      if (last?.stamp === stamp) newDailyStreak = prev.dailyStreak;
      else if (last?.stamp === yest.toDateString())
        newDailyStreak = (prev.dailyStreak ?? 0) + 1;
      else newDailyStreak = 1;
      return {
        ...prev,
        dailyDone: true,
        dailyDoneStamp: stamp,
        dailyScore: correctScore,
        dailyStreak: newDailyStreak,
        dailyHistory: [
          ...(prev.dailyHistory ?? []),
          {
            day: dayLabel,
            score: correctScore,
            stamp,
            results: hist.map((h) => h.correct),
          },
        ],
        hintsLeft: 1,
      };
    });

    this.router.navigate(['/daily-result'], { replaceUrl: true });
  }

  protected exit(): void {
    this.router.navigate(['/home']);
  }

  protected openInfo(type: 'glyph' | 'script'): void {
    this.infoOverlay.set(type);
  }

  protected closeInfo(): void {
    this.infoOverlay.set(null);
  }

  protected nameOf(opt: ScriptInfo): string {
    return this.i18n.lang() === 'en' ? opt.nameEn : opt.nameIt;
  }

  /** Stato visuale dell'opzione (`data-state`): '' | 'dim' | 'reveal' | 'correct' | 'wrong'. */
  protected optState(opt: ScriptInfo): string {
    if (this.eliminated().includes(opt.id)) return 'dim';
    const c = this.chosen();
    if (!c) return '';
    const q = this.question();
    if (!q) return '';
    if (opt.id === q.correct.id) return 'reveal';
    if (opt.id === c.id) return c.correct ? 'correct' : 'wrong';
    return 'dim';
  }

  /** Regione del prototipo "Giappone / Mondo arabo" -> prima parola per il tag. */
  protected tagOf(opt: ScriptInfo): string {
    return opt.region.split(/[\s/]/)[0];
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.infoOverlay()) {
        e.preventDefault();
        this.closeInfo();
      }
      return;
    }
    if (this.chosen()) {
      if (!this.isTimed() && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        this.advance();
      }
      return;
    }
    if (e.key.toLowerCase() === 'h') {
      e.preventDefault();
      this.useHint();
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) {
      const q = this.question();
      if (q) {
        e.preventDefault();
        this.pick(q.options[n - 1]);
      }
    }
  }
}
