import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { Lang } from '../core/state/types';
import { Icon } from './icon';

interface LangOption {
  code: Lang;
  label: string;
}

@Component({
  selector: 'app-lang-switch',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lang-switch" [class.is-open]="open()">
      <button class="nav-btn lang-trigger" (click)="toggle($event)" [attr.aria-expanded]="open()" aria-label="Language">
        <span class="lang-code-display">{{ i18n.lang().toUpperCase() }}</span>
        <span class="lang-chev"><app-icon name="chev" /></span>
      </button>
      @if (open()) {
        <div class="lang-pop">
          @for (l of langs; track l.code) {
            <button (click)="pick(l.code)" [class.is-current]="i18n.lang() === l.code">
              <span class="lang-pop-code">{{ l.code.toUpperCase() }}</span>
              <span>{{ l.label }}</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: inline-block; }
    .lang-switch { position: relative; }
    .lang-trigger {
      gap: 6px;
      padding: 0 10px;
    }
    .lang-code-display {
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1;
      color: var(--text-dim);
      transition: color var(--hover-dur) ease;
    }
    .lang-trigger:hover .lang-code-display,
    .lang-switch.is-open .lang-code-display { color: var(--text); }

    /* Chevron rivolta in basso a riposo, ruota a "in alto" quando il
       dropdown e' aperto. inline-flex + align/justify center fanno sì che
       l'SVG sia centrato nel proprio box e la rotazione avvenga intorno al
       centro effettivo (non al baseline del testo accanto). */
    .lang-chev {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      transform: rotate(90deg);
      transform-origin: center center;
      transition: transform 180ms var(--tx-ease);
    }
    .lang-chev svg { width: 14px; height: 14px; display: block; }
    .lang-switch.is-open .lang-chev { transform: rotate(-90deg); }
    [data-motion='minimal'] .lang-chev { transition: none; }
    .lang-pop {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
      z-index: 10;
      min-width: 140px;
      box-shadow: var(--shadow-pop);
      animation: pop 140ms var(--tx-ease);
    }
    .lang-pop button {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: transparent;
      border: 0;
      color: var(--text);
      border-radius: 6px;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }
    .lang-pop button.is-current { color: var(--accent); }
    .lang-pop-code {
      font-family: var(--font-mono);
      font-size: 10px;
      width: 18px;
      color: var(--text-mute);
    }
  `,
})
export class LangSwitch {
  protected readonly i18n = inject(I18nService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly open = signal(false);

  protected readonly langs: LangOption[] = [
    { code: 'it', label: 'Italiano' },
    { code: 'en', label: 'English' },
  ];

  toggle(e: Event): void {
    e.stopPropagation();
    this.open.update((v) => !v);
  }

  pick(code: Lang): void {
    this.i18n.set(code);
    this.open.set(false);
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocMouseDown(e: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(e.target as Node)) {
      this.open.set(false);
    }
  }
}
