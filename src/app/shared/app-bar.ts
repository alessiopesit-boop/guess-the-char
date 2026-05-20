import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { Icon } from './icon';
import { Logo } from './logo';

@Component({
  selector: 'app-bar',
  imports: [Icon, Logo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="appbar">
      <div class="appbar-l">
        @if (showNav()) {
          <button class="nav-btn" [attr.aria-label]="i18n.t('back')" (click)="back.emit()">
            <app-icon name="back" />
            <span style="font-size: 13px">{{ i18n.t('back') }}</span>
          </button>
          <button class="nav-btn" aria-label="Home" (click)="goHome.emit()" style="padding: 0 10px">
            <app-icon name="home" />
          </button>
        } @else {
          <app-logo />
        }
        @if (title(); as t) {
          <span class="h3" style="margin-left: 6px">{{ t }}</span>
        }
      </div>
      <div class="appbar-r">
        <ng-content />
      </div>
    </div>
  `,
})
export class AppBar {
  protected readonly i18n = inject(I18nService);

  readonly canBack = input(false);
  readonly leftMode = input<'auto' | 'nav' | 'logo'>('auto');
  readonly title = input<string>('');

  readonly back = output<void>();
  readonly goHome = output<void>();

  protected readonly showNav = computed(() => {
    const m = this.leftMode();
    return m === 'nav' || (m === 'auto' && this.canBack());
  });
}
