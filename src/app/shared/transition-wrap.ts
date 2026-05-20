import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type TransitionDir = 'forward' | 'back' | null;

@Component({
  selector: 'app-transition-wrap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="cls()">
      <ng-content />
    </div>
  `,
})
export class TransitionWrap {
  readonly dir = input<TransitionDir>(null);

  protected readonly cls = computed(() => {
    const d = this.dir();
    return 'tx ' + (d === 'back' ? 'tx-back' : d === 'forward' ? 'tx-fwd' : '');
  });
}
