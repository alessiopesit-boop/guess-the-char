import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 18;
const CIRCUMF = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-timer-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg width="44" height="44" viewBox="0 0 44 44" class="timer-ring" [class.is-low]="isLow()">
      <circle cx="22" cy="22" [attr.r]="r" fill="none" stroke="var(--border-strong)" stroke-width="3" />
      <circle
        cx="22" cy="22" [attr.r]="r"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        [attr.stroke-dasharray]="circumf"
        [attr.stroke-dashoffset]="dashOffset()"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" text-anchor="middle" font-size="13" font-weight="600"
            fill="currentColor" font-family="var(--font-mono)">{{ seconds() }}</text>
    </svg>
  `,
  styles: `
    .timer-ring { color: var(--accent); }
    .timer-ring.is-low { color: var(--danger); animation: pulse-fast 700ms ease-in-out infinite; }
    @keyframes pulse-fast {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }
  `,
})
export class TimerRing {
  readonly seconds = input.required<number>();
  readonly max = input.required<number>();

  protected readonly r = RADIUS;
  protected readonly circumf = CIRCUMF;
  protected readonly dashOffset = computed(() => {
    const pct = Math.max(0, Math.min(1, this.seconds() / this.max()));
    return CIRCUMF * (1 - pct);
  });
  protected readonly isLow = computed(() => this.seconds() <= 5);
}
