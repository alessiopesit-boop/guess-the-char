import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { AppBar } from './app-bar';

@Component({
  selector: 'app-coming-soon',
  imports: [AppBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <app-bar [canBack]="true" (back)="goBack()" (goHome)="goHome()" />
      <div class="page coming-soon-page">
        <div class="coming-soon">
          <span class="coming-soon-mark">∞</span>
          <h1 class="h1">{{ i18n.t('comingSoon') }}</h1>
          <p class="muted">{{ i18n.t('comingSoonBody') }}</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    .coming-soon-page {
      min-height: calc(100dvh - 80px);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .coming-soon {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 40px 0;
    }
    .coming-soon-mark {
      font-family: var(--font-display);
      font-size: 72px;
      line-height: 1;
      color: var(--accent);
    }
    .coming-soon .muted { max-width: 320px; }
  `,
})
export class ComingSoon {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly i18n = inject(I18nService);

  protected goBack(): void {
    this.location.back();
  }

  protected goHome(): void {
    this.router.navigate(['/home']);
  }
}
