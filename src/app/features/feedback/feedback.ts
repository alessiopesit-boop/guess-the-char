import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppStateService } from '../../core/state/app-state.service';
import { FeedbackService } from '../../core/firebase/feedback.service';
import { AppBar } from '../../shared/app-bar';
import { APP_VERSION } from '../../core/build-info';

type Kind = 'bug' | 'idea';

@Component({
  selector: 'app-feedback',
  imports: [AppBar, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feedback.html',
  styleUrl: './feedback.css',
})
export class Feedback {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);
  protected readonly appState = inject(AppStateService);
  private readonly fbSvc = inject(FeedbackService);

  protected readonly kind = signal<Kind>('bug');
  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly email = signal('');
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Quante submission restano oggi (3 al giorno). */
  protected readonly remaining = signal(this.fbSvc.remainingSubmissions());

  protected readonly titleValid = computed(() => {
    const t = this.title().trim();
    return t.length >= 3 && t.length <= 80;
  });
  protected readonly bodyValid = computed(() => {
    const b = this.body().trim();
    return b.length >= 8 && b.length <= 600;
  });
  protected readonly canSubmit = computed(
    () =>
      this.titleValid() &&
      this.bodyValid() &&
      !this.busy() &&
      this.remaining() > 0,
  );

  /** Placeholder dinamici per i campi (cambiano in base a bug/idea + lingua). */
  protected readonly titlePlaceholder = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    if (this.kind() === 'bug') {
      return isIt
        ? 'es. Il timer non riparte dopo la pausa'
        : 'e.g. Timer does not restart after pause';
    }
    return isIt ? "es. Modalita' per scritture estinte" : 'e.g. Mode for extinct scripts';
  });
  protected readonly bodyPlaceholder = computed(() => {
    const isIt = this.i18n.lang() === 'it';
    if (this.kind() === 'bug') {
      return isIt
        ? "Come e' successo? Cosa ti aspettavi?"
        : 'How did it happen? What did you expect?';
    }
    return isIt ? 'Come la useresti? A che scopo serve?' : 'How would you use it? What problem does it solve?';
  });

  /** Info che viene inclusa col feedback, mostrate nell'expandable. */
  protected readonly metaPreview = computed(() => {
    const s = this.appState.state();
    const w = typeof window !== 'undefined' ? window.innerWidth : 0;
    const h = typeof window !== 'undefined' ? window.innerHeight : 0;
    return `app: ${APP_VERSION}\nlang: ${this.i18n.lang()}\nscreen: ${w}x${h}\nplayed: ${s.played}, streak: ${s.streak}`;
  });

  protected setKind(k: Kind): void {
    this.kind.set(k);
    this.error.set(null);
  }
  protected setTitle(v: string): void {
    this.title.set(v);
    if (this.error()) this.error.set(null);
  }
  protected setBody(v: string): void {
    this.body.set(v);
    if (this.error()) this.error.set(null);
  }
  protected setEmail(v: string): void {
    this.email.set(v);
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const r = await this.fbSvc.submit({
        kind: this.kind(),
        title: this.title(),
        body: this.body(),
        email: this.email(),
        lang: this.i18n.lang(),
      });
      if (r === 'rate-limited') {
        this.error.set(
          this.i18n.lang() === 'it'
            ? 'Hai gia\' inviato 3 feedback nelle ultime 24 ore. Riprova domani.'
            : "You've already sent 3 feedbacks in the last 24 hours. Try again tomorrow.",
        );
        return;
      }
      this.submitted.set(true);
      this.remaining.set(this.fbSvc.remainingSubmissions());
    } catch (e: unknown) {
      console.warn('[feedback] submit error:', e);
      this.error.set(
        this.i18n.lang() === 'it'
          ? 'Errore di invio. Controlla la connessione e riprova.'
          : 'Send error. Check your connection and try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected sendAnother(): void {
    this.submitted.set(false);
    this.kind.set('bug');
    this.title.set('');
    this.body.set('');
    this.error.set(null);
    this.remaining.set(this.fbSvc.remainingSubmissions());
  }

  protected goBack(): void {
    this.location.back();
  }
  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
