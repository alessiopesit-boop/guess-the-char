import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { Icon } from './icon';

@Component({
  selector: 'app-streak-pill',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pill warm" [class.streak-bump]="bumping()" title="Streak">
      <app-icon name="flame" />
      <span class="tabnum" style="font-weight: 600">{{ value() }}</span>
    </span>
  `,
})
export class StreakPill {
  readonly value = input.required<number>();

  protected readonly bumping = signal(false);
  private prev: number | null = null;

  constructor() {
    effect(() => {
      const v = this.value();
      if (this.prev !== null && v !== this.prev) {
        this.bumping.set(true);
        setTimeout(() => this.bumping.set(false), 280);
      }
      this.prev = v;
    });
  }
}
