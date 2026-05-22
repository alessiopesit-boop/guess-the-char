import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * Piccola modale informativa riusabile: titolo + corpo, chiude con X / Esc /
 * backdrop. Usata in home per spiegare cosa significa ciascun contatore.
 */
@Component({
  selector: 'app-info-sheet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop info-backdrop" (click)="close.emit()">
      <div class="sheet info-sheet" (click)="$event.stopPropagation()">
        <button class="btn-icon info-close" type="button" (click)="close.emit()" aria-label="Close">
          <app-icon name="close" />
        </button>
        <h2 class="h2 info-title">{{ title() }}</h2>
        <p class="muted info-body">{{ body() }}</p>
      </div>
    </div>
  `,
  styles: `
    .info-backdrop { align-items: center; z-index: 90; }
    .info-sheet {
      max-width: 380px;
      border-radius: 20px;
      padding: 22px;
      animation: pop 0.18s ease;
      position: relative;
      text-align: left;
    }
    .info-close {
      position: absolute;
      top: 12px;
      right: 12px;
    }
    .info-title { margin: 0 28px 8px 0; }
    .info-body {
      font-size: 14px;
      line-height: 1.55;
      margin: 0;
    }
  `,
})
export class InfoSheet {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  protected onEsc(): void {
    this.close.emit();
  }
}
