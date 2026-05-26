import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { AppBar } from '../../shared/app-bar';

/**
 * Pagina /privacy: testo informativo bilingue (IT/EN) sulla raccolta dati.
 * Serve sia agli utenti dell'app che alla scheda Play Store, che richiede
 * un URL pubblico di privacy policy per pubblicare l'app.
 */
@Component({
  selector: 'app-privacy',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.html',
  styleUrl: './privacy.css',
})
export class Privacy {
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  /** Aggiornata a mano quando il testo cambia in modo sostanziale: comparira'
   *  in fondo alla pagina cosi' chi torna sa se la policy e' cambiata. */
  protected readonly lastUpdated = '2026-05-26';

  protected goBack(): void {
    this.router.navigate(['/home']);
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
