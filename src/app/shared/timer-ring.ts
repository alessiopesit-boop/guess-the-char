import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const R = 12;
const C = 2 * Math.PI * R;

@Component({
  selector: 'app-timer-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timer-ring-wrap">
      <svg class="timer-ring" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" [attr.r]="r" stroke="var(--surface-3)" stroke-width="2.5" fill="none" />
        <circle
          cx="15"
          cy="15"
          [attr.r]="r"
          [attr.stroke]="isLow() ? 'var(--danger)' : 'var(--accent)'"
          stroke-width="2.5"
          fill="none"
          stroke-linecap="round"
          [attr.stroke-dasharray]="c"
          [attr.stroke-dashoffset]="dashOffset()"
        />
      </svg>
      <span class="timer-num" [class.is-low]="isLow()">{{ seconds() }}</span>
    </div>
  `,
  styles: `
    .timer-ring-wrap { position: relative; width: 30px; height: 30px; }
    .timer-ring { transform: rotate(-90deg); }
    .timer-ring circle { transition: stroke-dashoffset .9s linear; }
    .timer-num {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text);
    }
    .timer-num.is-low { color: var(--danger); }
  `,
})
export class TimerRing {
  readonly seconds = input.required<number>();
  readonly max = input.required<number>();

  protected readonly r = R;
  protected readonly c = C;
  protected readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(1, this.seconds() / this.max()));
    return C - pct * C;
  });
  protected readonly isLow = computed(() => this.seconds() <= 10);
}
