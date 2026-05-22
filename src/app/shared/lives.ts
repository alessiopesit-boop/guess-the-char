import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-lives',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="lives" [attr.aria-label]="count() + ' lives'">
      @for (i of slots(); track $index) {
        <svg
          viewBox="0 0 24 24"
          [attr.fill]="i < count() ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.5"
          [style.color]="i < count() ? 'var(--danger)' : 'var(--border-strong)'"
        >
          <path d="M12 21s-7-4.5-9.5-9C.5 7.8 3.5 4 7 4c2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.5 0 6.5 3.8 4.5 8-2.5 4.5-9.5 9-9.5 9z"/>
        </svg>
      }
    </span>
  `,
  styles: `
    .lives {
      display: inline-flex;
      gap: 4px;
      align-items: center;
    }
    .lives svg {
      width: 14px;
      height: 14px;
    }
  `,
})
export class Lives {
  readonly count = input.required<number>();
  readonly max = input(3);
  protected readonly slots = computed(() =>
    Array.from({ length: this.max() }, (_, i) => i),
  );
}
