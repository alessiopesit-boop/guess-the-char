import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sheet-backdrop confirm-backdrop" (click)="cancel.emit()">
      <div class="sheet confirm-sheet" (click)="$event.stopPropagation()">
        <h2 class="h2">{{ title() }}</h2>
        @if (body(); as b) {
          <p class="muted" style="margin-top: 8px">{{ b }}</p>
        }
        <div class="confirm-actions">
          <button class="btn btn-primary" (click)="confirmed.emit()" cdkFocusInitial>{{ confirmLabel() }}</button>
          @if (extraLabel(); as l) {
            <button class="btn btn-ghost danger-text" (click)="extra.emit()">{{ l }}</button>
          }
          <button class="btn btn-ghost" (click)="cancel.emit()">{{ cancelLabel() }}</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .confirm-backdrop { align-items: center; z-index: 80; }
    .confirm-sheet {
      max-width: 380px;
      border-radius: 20px;
      padding: 22px;
      animation: pop .18s ease;
    }
    .confirm-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 18px;
    }
    .danger-text { color: var(--danger); }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly body = input<string>('');
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly extraLabel = input<string | null>(null);

  readonly confirmed = output<void>();
  readonly cancel = output<void>();
  readonly extra = output<void>();
}
